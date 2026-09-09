import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';

export type BizVerifyStatus = 'active' | 'suspended' | 'closed' | 'not_found';

export type NtsBusinessStatusResult = {
  ok: boolean;
  businessNumber: string;
  status: BizVerifyStatus;
  statusLabel: string;
  taxType: string | null;
  closedOn: string | null;
  message: string;
};

type NtsStatusItem = {
  b_no?: string;
  b_stt?: string;
  b_stt_cd?: string;
  tax_type?: string;
  end_dt?: string;
};

type NtsStatusResponse = {
  status_code?: string;
  data?: NtsStatusItem[];
};

function getServiceKey(): string {
  return process.env.NTS_BUSINESS_SERVICE_KEY?.trim() ?? '';
}

export function isNtsBusinessApiConfigured(): boolean {
  return Boolean(getServiceKey());
}

function mapStatus(item: NtsStatusItem): Pick<NtsBusinessStatusResult, 'status' | 'statusLabel'> {
  const code = item.b_stt_cd?.trim() ?? '';
  const label = item.b_stt?.trim() ?? '';
  const taxType = item.tax_type?.trim() ?? '';

  if (code === '01') return { status: 'active', statusLabel: label || '계속사업자' };
  if (code === '02') return { status: 'suspended', statusLabel: label || '휴업자' };
  if (code === '03') return { status: 'closed', statusLabel: label || '폐업자' };
  if (taxType.includes('등록되지 않은')) {
    return { status: 'not_found', statusLabel: '미등록' };
  }
  return { status: 'not_found', statusLabel: label || '확인할 수 없음' };
}

export async function lookupNtsBusinessStatus(rawNumber: string): Promise<NtsBusinessStatusResult> {
  const digits = digitsOnly(rawNumber);
  const businessNumber = formatBusinessNumber(digits);

  if (digits.length !== 10) {
    return {
      ok: false,
      businessNumber,
      status: 'not_found',
      statusLabel: '미등록',
      taxType: null,
      closedOn: null,
      message: '사업자등록번호 10자리를 입력해 주세요.',
    };
  }

  const serviceKey = getServiceKey();
  if (!serviceKey) {
    return {
      ok: false,
      businessNumber,
      status: 'not_found',
      statusLabel: '미등록',
      taxType: null,
      closedOn: null,
      message: '국세청 사업자 조회 설정이 없습니다. NTS_BUSINESS_SERVICE_KEY를 확인해 주세요.',
    };
  }

  const url = new URL('https://api.odcloud.kr/api/nts-businessman/v1/status');
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('returnType', 'JSON');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ b_no: [digits] }),
    cache: 'no-store',
  });

  let payload: NtsStatusResponse | null = null;
  try {
    payload = (await response.json()) as NtsStatusResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload) {
    return {
      ok: false,
      businessNumber,
      status: 'not_found',
      statusLabel: '미등록',
      taxType: null,
      closedOn: null,
      message: '국세청 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  const item = payload.data?.[0];
  if (!item) {
    return {
      ok: false,
      businessNumber,
      status: 'not_found',
      statusLabel: '미등록',
      taxType: null,
      closedOn: null,
      message: '국세청에 등록되지 않은 사업자등록번호입니다.',
    };
  }

  const mapped = mapStatus(item);
  const taxType = item.tax_type?.trim() || null;
  const closedOn = item.end_dt?.trim() || null;

  if (mapped.status !== 'active') {
    const message =
      mapped.status === 'closed'
        ? `폐업자로 조회되었습니다.${closedOn ? ` (폐업일 ${closedOn})` : ''}`
        : mapped.status === 'suspended'
          ? '휴업자로 조회되었습니다. 계속사업자만 채용 정보를 등록할 수 있습니다.'
          : taxType || '국세청에 등록되지 않은 사업자등록번호입니다.';
    return {
      ok: false,
      businessNumber,
      status: mapped.status,
      statusLabel: mapped.statusLabel,
      taxType,
      closedOn,
      message,
    };
  }

  return {
    ok: true,
    businessNumber,
    status: 'active',
    statusLabel: mapped.statusLabel,
    taxType,
    closedOn,
    message: '계속사업자로 조회되었습니다. 회사명을 입력해 주세요.',
  };
}

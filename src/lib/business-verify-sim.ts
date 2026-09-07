export type BizVerifyStatus = 'active' | 'closed' | 'not_found';

export type BizVerifyRecord = {
  businessNumber: string;
  companyName: string;
  status: BizVerifyStatus;
  verifiedAt: string;
  simulated: true;
};

export type BizVerifyResult = BizVerifyRecord & {
  ok: boolean;
  message: string;
};

const STORAGE_KEY = 'job365.bizVerifySim';
const LOOKUP_DELAY_MS = 900;

type Store = Record<string, BizVerifyRecord>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function formatBusinessNumber(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function loadBizVerify(userId: string): BizVerifyRecord | null {
  const record = readStore()[userId];
  return record?.status === 'active' ? record : null;
}

export function saveBizVerify(userId: string, record: BizVerifyRecord): void {
  const store = readStore();
  store[userId] = record;
  writeStore(store);
}

export function clearBizVerify(userId: string): void {
  const store = readStore();
  delete store[userId];
  writeStore(store);
}

export async function simulateBusinessLookup(
  rawNumber: string,
  companyName: string,
): Promise<BizVerifyResult> {
  const digits = digitsOnly(rawNumber);
  const name = companyName.trim();
  const businessNumber = formatBusinessNumber(digits);

  await new Promise((resolve) => setTimeout(resolve, LOOKUP_DELAY_MS));

  if (digits.length !== 10) {
    return {
      ok: false,
      simulated: true,
      status: 'not_found',
      businessNumber,
      companyName: name,
      verifiedAt: '',
      message: '사업자등록번호 10자리를 입력해 주세요.',
    };
  }

  if (!name) {
    return {
      ok: false,
      simulated: true,
      status: 'not_found',
      businessNumber,
      companyName: name,
      verifiedAt: '',
      message: '상호를 입력해 주세요.',
    };
  }

  if (digits === '0000000000') {
    return {
      ok: false,
      simulated: true,
      status: 'not_found',
      businessNumber,
      companyName: name,
      verifiedAt: '',
      message: '등록되지 않은 번호입니다. (시뮬레이션)',
    };
  }

  if (digits === '1111111111') {
    return {
      ok: false,
      simulated: true,
      status: 'closed',
      businessNumber,
      companyName: name,
      verifiedAt: '',
      message: '폐업자로 확인되었습니다. (시뮬레이션)',
    };
  }

  return {
    ok: true,
    simulated: true,
    status: 'active',
    businessNumber,
    companyName: name,
    verifiedAt: new Date().toISOString(),
    message: '계속사업자로 확인되었습니다. (시뮬레이션)',
  };
}

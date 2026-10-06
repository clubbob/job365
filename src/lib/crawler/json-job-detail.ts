import { BROWSER_AJAX_HEADERS } from '@/lib/crawler/browser-headers';
import { buildDescription, textSection } from '@/lib/crawler/map-fields';
import { isInvalidJobDescription } from '@/lib/crawler/job-quality';
import type { JobDetailFetchResult } from '@/lib/crawler/fetch-job-detail';

const DETAIL_TEXT_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'introKr', label: '소개' },
  { key: 'intro', label: '소개' },
  { key: 'introduction', label: '소개' },
  { key: 'mainDutyInfo', label: '주요 업무' },
  { key: 'workContentDesc', label: '업무 내용' },
  { key: 'dutyKr', label: '수행 업무' },
  { key: 'qlfctKr', label: '자격 요건' },
  { key: 'qualification', label: '자격 요건' },
  { key: 'stepKr', label: '전형 일정' },
  { key: 'recProcessInfo', label: '전형 절차' },
  { key: 'processKr', label: '지원 방법' },
  { key: 'submitMethodInfo', label: '지원 방법' },
  { key: 'docInfoKr', label: '제출 서류' },
  { key: 'etcKr', label: '기타' },
  { key: 'otherInfo', label: '기타' },
  { key: 'privJdDtl', label: '업무 내용' },
  { key: 'privMustReq', label: '자격 요건' },
  { key: 'etc', label: '기타' },
];

function pickRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.result && typeof record.result === 'object') return record.result as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if (data.result && typeof data.result === 'object') return data.result as Record<string, unknown>;
    return data;
  }
  return record;
}

function buildJsonDescription(record: Record<string, unknown>, items: Record<string, unknown>[]): string {
  const jobSections = items
    .map((item) => {
      const parts = [
        typeof item.jobNameKr === 'string' ? `<strong>${item.jobNameKr}</strong>` : '',
        typeof item.dutyKr === 'string' ? textSection('수행 업무', item.dutyKr) : '',
        typeof item.skillKr === 'string' ? textSection('필요 역량', item.skillKr) : '',
      ].filter(Boolean);
      return parts.join('');
    })
    .join('');

  return buildDescription([
    ...DETAIL_TEXT_FIELDS.map(({ key, label }) => textSection(label, record[key] as string | undefined)),
    jobSections,
    textSection('문의', [record.mainTel, record.email].filter((v) => typeof v === 'string').join(' / ') as string),
  ]);
}

function parseGreenhouseLikeDetail(record: Record<string, unknown>): JobDetailFetchResult | null {
  const title = typeof record.title === 'string' ? record.title.trim() : undefined;
  const companyName =
    (typeof record.company_name === 'string' && record.company_name.trim()) ||
    (typeof record.companyName === 'string' && record.companyName.trim()) ||
    undefined;
  const content = typeof record.content === 'string' ? record.content.trim() : '';
  if (!title || !content || isInvalidJobDescription(content)) return null;

  let deadline: string | null = null;
  if (typeof record.application_deadline === 'string' && record.application_deadline.trim()) {
    const match = record.application_deadline.match(/(\d{4})-(\d{2})-(\d{2})/);
    deadline = match ? `${match[1]}-${match[2]}-${match[3]}` : null;
  }

  return { title, companyName, deadline, description: content };
}

export function parseJsonJobDetail(payload: unknown): JobDetailFetchResult | null {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  if (!root) return null;

  if (root.success && typeof root.success === 'object') {
    const greenhouseLike = parseGreenhouseLikeDetail(root.success as Record<string, unknown>);
    if (greenhouseLike) return greenhouseLike;
  }

  const data = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null;
  const applyInfo =
    data?.applyInfo && typeof data.applyInfo === 'object'
      ? (data.applyInfo as Record<string, unknown>)
      : null;
  const record = applyInfo ?? pickRecord(root);
  if (!record) return null;

  const items = Array.isArray(data?.items)
    ? (data.items as Record<string, unknown>[])
    : [];

  const title = [record.recuNoticeNm, record.title, record.jobNoticeName, record.jobOfferTitle, record.recruitTitle].find(
    (v) => typeof v === 'string' && v.trim(),
  ) as string | undefined;
  const companyName = [record.logoNm, record.cmpNameKr, record.companyName, record.corpName].find(
    (v) => typeof v === 'string' && v.trim(),
  ) as string | undefined;

  const description = buildJsonDescription(record, items);
  if (isInvalidJobDescription(description)) return null;

  let deadline: string | null = null;
  const enddate =
    (typeof record.applyEndDt === 'string' && record.applyEndDt) ||
    (typeof record.appDispEdDt === 'string' && record.appDispEdDt) ||
    (typeof record.enddate === 'string' && record.enddate) ||
    null;
  if (enddate && enddate.length >= 8) {
    const digits = enddate.replace(/\D/g, '');
    deadline = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  return {
    title,
    companyName,
    deadline,
    description,
  };
}

export async function fetchJsonJobDetail(
  detailApiUrl: string,
  referer: string,
): Promise<JobDetailFetchResult | null> {
  try {
    const res = await fetch(detailApiUrl, {
      headers: {
        ...BROWSER_AJAX_HEADERS,
        Referer: referer,
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return parseJsonJobDetail(payload);
  } catch {
    return null;
  }
}

export function inferJsonDetailApiUrl(applyUrl: string): string | null {
  try {
    const url = new URL(applyUrl);
    const recuYy = url.searchParams.get('recuYy');
    const recuType = url.searchParams.get('recuType');
    const recuCls = url.searchParams.get('recuCls');
    if (recuYy && recuType && recuCls) {
      return `${url.origin}/api/rec/AP-HM-FO-02820?hgrCd=1&lang=ko&recuYy=${recuYy}&recuType=${recuType}&recuCls=${recuCls}`;
    }

    const ghJid = url.searchParams.get('gh_jid');
    if (ghJid && /toss\.im$/i.test(url.hostname)) {
      return `https://api-public.toss.im/api/v3/ipd-eggnog/career/jobs/${ghJid}`;
    }

    const seq = url.searchParams.get('no') ?? url.searchParams.get('seqno') ?? url.searchParams.get('seq');
    if (!seq) return null;
    return `${url.origin}/recruit/detail.data?seqno=${seq}&strCode=`;
  } catch {
    return null;
  }
}

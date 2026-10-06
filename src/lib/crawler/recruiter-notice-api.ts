import { BROWSER_AJAX_HEADERS } from '@/lib/crawler/browser-headers';
import { isLikelyJobTitle } from '@/lib/crawler/job-heuristics';
import { normalizeJobTitle } from '@/lib/crawler/normalize-job-title';

export type RecruiterNoticeCandidate = {
  title: string;
  applyUrl: string;
  companyName: string;
  dedupeKey: string;
  deadline?: string | null;
  locationHint?: string;
  roleHint?: string;
  periodHint?: string;
  listDescription?: string;
  detailApiUrl?: string;
};

type NoticeRecord = Record<string, unknown>;

function parseDateTime(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function noticeRecordToCandidate(
  item: NoticeRecord,
  origin: string,
  defaultCompanyName: string,
): RecruiterNoticeCandidate | null {
  const title = [item.recruitNoticeName, item.title, item.jobNoticeName].find(
    (value) => typeof value === 'string' && value.trim().length >= 4,
  ) as string | undefined;
  if (!title || !isLikelyJobTitle(title.trim())) return null;

  const companyName =
    (typeof item.company === 'string' && item.company.trim()) ||
    (typeof item.companyCategory === 'string' && item.companyCategory.trim()) ||
    defaultCompanyName;

  let applyUrl: string | null = null;
  const rawUrl = [item.recruitNoticeUrl, item.detailUrl, item.applyUrl, item.url].find(
    (value) => typeof value === 'string' && value.trim(),
  ) as string | undefined;

  if (rawUrl) {
    try {
      applyUrl = new URL(rawUrl, origin).toString();
    } catch {
      applyUrl = null;
    }
  }

  if (!applyUrl && typeof item.recruitNoticeSn === 'number') {
    applyUrl = `${origin}/career/jobs/${item.recruitNoticeSn}`;
  }

  if (!applyUrl) return null;

  const receiveStart =
    typeof item.receiveStartDatetime === 'string' ? item.receiveStartDatetime.slice(0, 10) : null;
  const receiveEnd =
    typeof item.receiveEndDatetime === 'string' ? item.receiveEndDatetime.slice(0, 10) : null;
  const periodHint = receiveStart && receiveEnd ? `${receiveStart} ~ ${receiveEnd}` : undefined;
  const listDescription = typeof item.contents === 'string' && item.contents.trim() ? item.contents : undefined;

  const roleHint = [item.recruitTypeName, item.recruitClassName]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' · ');

  return {
    title: normalizeJobTitle(title.trim()),
    applyUrl,
    companyName,
    dedupeKey: applyUrl,
    deadline: parseDateTime(item.receiveEndDatetime),
    roleHint: roleHint || undefined,
    periodHint,
    listDescription,
  };
}

function extractNoticeList(payload: unknown): NoticeRecord[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;

  if (Array.isArray(root.data)) return root.data as NoticeRecord[];
  if (root.success && typeof root.success === 'object') {
    const success = root.success as Record<string, unknown>;
    if (Array.isArray(success.data)) return success.data as NoticeRecord[];
    if (Array.isArray(success.results)) return success.results as NoticeRecord[];
  }

  return [];
}

async function fetchJson(url: string, referer: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { ...BROWSER_AJAX_HEADERS, Referer: referer },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildRecruiterListUrls(origin: string): string[] {
  const params = new URLSearchParams({
    currentPage: '1',
    pageSize: '100',
    isInProgress: 'true',
    isContainsContents: 'true',
  });

  return [
    `${origin}/api/recruit?${params}`,
    `${origin}/api/v1/jobda/getRecruitNoticeList?isPost=true&LANG=KR`,
    `${origin}/api/v1/jobda/getRecruitNoticeList?isPost=true&isInProgress=true&LANG=KR`,
  ];
}

/** recruiter.co.kr·jobda 계열 공개 채용 목록 API를 조회합니다. */
export async function fetchRecruiterNoticeCandidates(
  careersUrl: string,
  defaultCompanyName: string,
): Promise<RecruiterNoticeCandidate[]> {
  const origin = new URL(careersUrl).origin;
  const candidates: RecruiterNoticeCandidate[] = [];
  const seen = new Set<string>();

  for (const url of buildRecruiterListUrls(origin)) {
    const payload = await fetchJson(url, careersUrl);
    const items = extractNoticeList(payload);
    if (items.length === 0) continue;

    for (const item of items) {
      if (item.isPost === false || item.isInProgress === false) continue;
      const candidate = noticeRecordToCandidate(item, origin, defaultCompanyName);
      if (!candidate || seen.has(candidate.dedupeKey)) continue;
      seen.add(candidate.dedupeKey);
      candidates.push(candidate);
    }

    if (candidates.length > 0) return candidates;
  }

  return candidates;
}

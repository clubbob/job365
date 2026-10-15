import { normalizeCompanyLabel } from '@/lib/crawler/company-name-match';
import { isLikelyJobUrl } from '@/lib/crawler/job-heuristics';
import { normalizeJobTitle } from '@/lib/crawler/normalize-job-title';
import { crawledJobRecruitingCompanyName } from '@/lib/job-display';
import type { CrawledJobListItem } from '@/types/crawled-job';

const TRACKING_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
] as const;

/** 지원 URL 비교용 (추적 파라미터·fragment 제거) */
export function normalizeApplyUrlForDedupe(applyUrl: string): string | null {
  const trimmed = applyUrl.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    url.hash = '';
    for (const key of TRACKING_QUERY_KEYS) {
      url.searchParams.delete(key);
    }
    const sorted = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    url.search = sorted.length ? `?${new URLSearchParams(sorted).toString()}` : '';
    const path = url.pathname.replace(/\/$/, '') || '/';
    return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
  } catch {
    return null;
  }
}

/** 목록에서 같은 공고(다른 수집 문서 id)를 한 건으로 묶을 때 쓰는 키 */
export function crawledJobListDedupeKey(
  job: Pick<CrawledJobListItem, 'id' | 'title' | 'companyName' | 'applyUrl'>,
): string {
  const title = normalizeCompanyLabel(normalizeJobTitle(job.title));
  const applyUrl = job.applyUrl?.trim() ?? '';
  const urlKey = applyUrl ? normalizeApplyUrlForDedupe(applyUrl) : null;

  // 동일 지원(원문) URL + 제목이면 모집 회사 표기가 달라도 한 건으로 봅니다.
  if (urlKey && title && isLikelyJobUrl(applyUrl)) {
    return `url:${urlKey}\u0001${title}`;
  }

  const employer = normalizeCompanyLabel(crawledJobRecruitingCompanyName(job) || job.companyName);
  if (!employer || !title) return `id:${job.id}`;
  return `${employer}\u0001${title}`;
}

/** createdAt·crawledAt 내림차순으로 정렬된 목록에서 앞 항목(최신)을 유지합니다. */
export function dedupeCrawledJobListItems<T extends CrawledJobListItem>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const job of items) {
    const key = crawledJobListDedupeKey(job);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

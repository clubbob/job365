/** 범용 수집: 회사별 전용 adapter 없이 속도·안정성 보강 */

export function isGenericFastDetailMode(): boolean {
  return process.env.CRAWL_GENERIC_FAST_DETAILS !== '0';
}

/** API 목록이 있으면 HTML·브라우저 단계를 건너뜁니다(기본 켜짐). */
export function skipHtmlWhenApiCandidatesFound(): boolean {
  return process.env.CRAWL_GENERIC_SKIP_HTML_WHEN_API_HITS !== '0';
}

export function isGenericBrowserEnabled(): boolean {
  return process.env.CRAWL_GENERIC_BROWSER !== '0';
}

import type { CompanySize } from '@/lib/job-board/constants';

export function jsonListMaxPagesForCompany(companySize?: CompanySize): number {
  const raw = Number(
    process.env.CRAWL_JSON_LIST_MAX_PAGES ??
      (companySize === '대기업' ? '20' : '12'),
  );
  if (!Number.isFinite(raw) || raw < 1) return 12;
  return Math.min(40, Math.floor(raw));
}

export function genericDetailFetchConcurrency(): number {
  const raw = Number(process.env.CRAWL_GENERIC_DETAIL_CONCURRENCY ?? '8');
  if (!Number.isFinite(raw) || raw < 1) return 8;
  return Math.min(16, Math.floor(raw));
}

import { getCrawlerCompanies } from '@/lib/crawler/companies';

/** 수집 소스(sourceId)에 연결된 채용 사이트 목록 URL */
export function getCrawlerCareersUrl(sourceId: string): string | null {
  const company = getCrawlerCompanies().find((item) => item.sourceId === sourceId);
  return company?.careersUrl ?? null;
}

/** 상세 페이지 출처 링크: 채용 사이트 목록 URL이 있으면 우선, 없으면 공고 원문 URL */
export function getCrawledJobSourcePageUrl(sourceId: string, applyUrl: string): string {
  return getCrawlerCareersUrl(sourceId) ?? applyUrl;
}

/** 공고 원문(지원) 페이지 URL */
export function getCrawledJobOriginalUrl(applyUrl: string): string {
  return applyUrl;
}

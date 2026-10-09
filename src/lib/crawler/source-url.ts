import { ENTERPRISE_CAREERS_CONFIGS } from '@/lib/crawler/enterprise-careers-urls';

/** 클라이언트·서버 공용 — firebase-admin·디스크 DB를 끌어오지 않습니다. */
const CAREERS_URL_BY_SOURCE_ID = new Map<string, string>(
  ENTERPRISE_CAREERS_CONFIGS.map((config) => [`${config.crawlSourceId}-careers`, config.careersUrl] as [string, string]),
);
CAREERS_URL_BY_SOURCE_ID.set('daangn-careers', 'https://team.daangn.com');
CAREERS_URL_BY_SOURCE_ID.set('sendbird-careers', 'https://sendbird.com/careers');

/** 수집 소스(sourceId)에 연결된 채용 사이트 목록 URL */
export function getCrawlerCareersUrl(sourceId: string): string | null {
  return CAREERS_URL_BY_SOURCE_ID.get(sourceId) ?? null;
}

/** 상세 페이지 출처 링크: 채용 사이트 목록 URL이 있으면 우선, 없으면 공고 원문 URL */
export function getCrawledJobSourcePageUrl(sourceId: string, applyUrl: string): string {
  return getCrawlerCareersUrl(sourceId) ?? applyUrl;
}

/** 공고 원문(지원) 페이지 URL */
export function getCrawledJobOriginalUrl(applyUrl: string): string {
  return applyUrl;
}

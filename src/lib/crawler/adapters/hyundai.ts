import type { CrawlerSourceResult } from '@/lib/crawler/types';

const SOURCE_ID = 'hyundai-careers';
const SOURCE_NAME = '현대자동차 채용';

/** NetFunnel·비공개 API로 목록 수집이 막혀 있을 때 빈 결과와 오류만 반환합니다. */
export async function crawlHyundaiCareers(): Promise<CrawlerSourceResult> {
  const errors: string[] = [];

  try {
    const res = await fetch('https://talent.hyundai.com/', {
      headers: { 'User-Agent': 'JobLink365Bot/1.0 (+https://joblink365.com)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      errors.push(`현대자동차: 채용 사이트 HTTP ${res.status}`);
    } else {
      errors.push('현대자동차: 공개 채용 목록 API를 찾지 못했습니다. 다음 수집 때 다시 시도합니다.');
    }
  } catch (error) {
    errors.push(`현대자동차: ${error instanceof Error ? error.message : '수집 실패'}`);
  }

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    jobs: [],
    errors,
  };
}

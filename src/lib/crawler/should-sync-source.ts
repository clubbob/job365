import type { CrawlerSourceResult } from '@/lib/crawler/types';

/**
 * 수집 결과를 DB에 반영(신규·마감 동기화)할지 판단합니다.
 * 목록 조회에 실패한 0건 결과로 기존 공고를 마감하지 않도록 보수적으로 처리합니다.
 */
export function shouldSyncCrawlSourceResult(result: CrawlerSourceResult): boolean {
  if (result.jobs.length > 0) return true;
  if (result.syncEmpty === true && result.errors.length === 0) return true;
  return false;
}

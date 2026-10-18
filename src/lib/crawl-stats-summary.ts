import {
  countBrowsableCrawledJobs,
  getAdminActiveJobCountForStats,
} from '@/lib/crawled-jobs-server';
import { listCrawlRunsPage, type CrawlRunListItem } from '@/lib/crawl-runs-server';
import { getRecruitingSegmentRegistryCounts } from '@/lib/recruiting-employers/admin-list';

export type CrawlStatsSummary = {
  /** 수집 대상 회사(명단) 수 — 대기업·계열 + 중견 + 기타 */
  companyCount: number;
  /** 마지막 수집에서 가져온 공고 건수 합계 */
  fetched: number;
  /** 마지막 수집에서 저장·갱신한 공고 건수 */
  saved: number;
  /** 마지막 수집에서 마감 처리한 공고 건수 */
  closed: number;
  /** 채용 정보·대시보드와 동일한 노출 기준 모집 중 건수 */
  activeJobs: number;
  /** DB status=active 수집 모집 중 건수 */
  storedActiveJobs: number;
  lastRun: {
    finishedAt: string;
    runKind: CrawlRunListItem['runKind'];
    sourceCount: number;
    errorSourceCount: number;
  } | null;
};

function countErrorSources(sources: CrawlRunListItem['sources']): number {
  return sources.filter((source) =>
    source.errors.some((line) => {
      const t = line.trim();
      if (!t) return false;
      if (t.startsWith('DB 배치:')) return false;
      if (t.startsWith('고용24')) return false;
      if (t.includes('WORK24_AUTH_KEY')) return false;
      return true;
    }),
  ).length;
}

export async function getCrawlStatsSummary(): Promise<CrawlStatsSummary> {
  const registry = getRecruitingSegmentRegistryCounts();
  const companyCount = registry.enterprise + registry['mid-sized'] + registry.misc;

  const [runsPage, activeJobs, storedActiveJobs] = await Promise.all([
    listCrawlRunsPage(1, 1),
    countBrowsableCrawledJobs().catch(() => 0),
    getAdminActiveJobCountForStats().catch(() => 0),
  ]);

  const latest = runsPage.runs[0];
  if (!latest) {
    return {
      companyCount,
      fetched: 0,
      saved: 0,
      closed: 0,
      activeJobs,
      storedActiveJobs,
      lastRun: null,
    };
  }

  const fetched = latest.sources.reduce((sum, source) => sum + (source.fetched ?? 0), 0);

  return {
    companyCount,
    fetched,
    saved: latest.totalUpserted,
    closed: latest.totalClosed,
    activeJobs,
    storedActiveJobs,
    lastRun: {
      finishedAt: latest.finishedAt || latest.startedAt,
      runKind: latest.runKind,
      sourceCount: latest.sources.length,
      errorSourceCount: countErrorSources(latest.sources),
    },
  };
}

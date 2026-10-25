import { getAdminCrawlStatsJobCounts } from '@/lib/crawled-jobs-server';
import {
  emptyCompanySegmentCounts,
  JOB_BOARD_COMPANY_SEGMENTS,
  sumCompanySegmentCounts,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';
import {
  countClosedBySegmentFromRunSources,
  countFetchedBySegmentFromRunSources,
} from '@/lib/crawler/crawl-fetched-by-segment';
import { listCrawlRunsPage, type CrawlRunListItem } from '@/lib/crawl-runs-server';
import {
  getRecruitingSegmentRegistryCounts,
  type RecruitingCompanyActiveCounts,
} from '@/lib/recruiting-employers/admin-list';

export type CrawlStatsSummary = {
  /** 「수집 채용 회사」명단 규모(IT는 대·중에서 제외 후 세 분류 합) */
  companyCount: number;
  companyRegistryBySegment: RecruitingCompanyActiveCounts;
  /** 마지막 수집에서 추가된(페이지에서 읽어 온) 공고 건수 합계 */
  fetched: number;
  /** 마지막 수집 추가된 공고 — 회사 분류별 */
  fetchedBySegment: Record<JobBoardCompanySegment, number>;
  /** 마지막 수집에서 마감 처리한 공고 건수 */
  closed: number;
  /** 마지막 수집 마감 처리 — 회사 분류별 */
  closedBySegment: Record<JobBoardCompanySegment, number>;
  /** 채용 정보·대시보드와 동일한 노출 기준 모집 중 건수 */
  activeJobs: number;
  /** 노출 채용 공고 — 회사 분류별(공고 1건당 1분류) */
  activeJobsBySegment: Record<JobBoardCompanySegment, number>;
  /** DB status=active 수집 공고 건수(모집 중, 회사·출처 집계 아님) */
  storedActiveJobs: number;
  /** 총 수집 채용 공고 — 회사 분류별(공고 1건당 1분류) */
  storedActiveJobsBySegment: Record<JobBoardCompanySegment, number>;
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

const emptyRunsPage = {
  runs: [] as CrawlRunListItem[],
  total: 0,
  page: 1,
  pageSize: 1,
  totalPages: 0,
};

function loadCompanyRegistryBySegment(): RecruitingCompanyActiveCounts {
  try {
    return getRecruitingSegmentRegistryCounts();
  } catch (error) {
    console.warn('[crawl-stats-summary] registry counts failed', error);
    return { enterprise: 0, 'mid-sized': 0, it: 0, 'semi-equipment': 0 };
  }
}

/** 구 수집 이력: totalClosed에만 잡히는 만료 마감 등을 분류별 fetched 비중으로 배분 */
function allocateClosedRemainder(
  closedBySegment: Record<JobBoardCompanySegment, number>,
  remainder: number,
  weightBySegment: Record<JobBoardCompanySegment, number>,
): void {
  if (remainder <= 0) return;
  const totalWeight = sumCompanySegmentCounts(weightBySegment);
  if (totalWeight <= 0) {
    closedBySegment['중견기업'] += remainder;
    return;
  }
  let assigned = 0;
  for (const segment of JOB_BOARD_COMPANY_SEGMENTS) {
    const share = Math.round((remainder * weightBySegment[segment]) / totalWeight);
    closedBySegment[segment] += share;
    assigned += share;
  }
  const dust = remainder - assigned;
  if (dust !== 0) {
    closedBySegment['중견기업'] += dust;
  }
}

function resolveLastRunFetchCloseStats(latest: CrawlRunListItem): {
  fetched: number;
  fetchedBySegment: Record<JobBoardCompanySegment, number>;
  closed: number;
  closedBySegment: Record<JobBoardCompanySegment, number>;
} {
  const fetchedBySegment =
    latest.fetchedBySegment ?? countFetchedBySegmentFromRunSources(latest.sources);
  const fetched = sumCompanySegmentCounts(fetchedBySegment);

  let closedBySegment: Record<JobBoardCompanySegment, number>;
  if (latest.closedBySegment) {
    closedBySegment = { ...latest.closedBySegment };
  } else {
    closedBySegment = countClosedBySegmentFromRunSources(latest.sources);
  }
  const closedAssigned = sumCompanySegmentCounts(closedBySegment);
  const closedRemainder = latest.totalClosed - closedAssigned;
  if (closedRemainder > 0) {
    allocateClosedRemainder(closedBySegment, closedRemainder, fetchedBySegment);
  }

  const closed = sumCompanySegmentCounts(closedBySegment);
  return { fetched, fetchedBySegment, closed, closedBySegment };
}

export async function getCrawlStatsSummary(options?: {
  waitForFullScan?: boolean;
}): Promise<CrawlStatsSummary> {
  const companyRegistryBySegment = loadCompanyRegistryBySegment();
  const companyCount =
    companyRegistryBySegment.enterprise +
    companyRegistryBySegment['mid-sized'] +
    companyRegistryBySegment.it +
    companyRegistryBySegment['semi-equipment'];

  const [runsPage, jobCounts] = await Promise.all([
    listCrawlRunsPage(1, 1).catch((error) => {
      console.warn('[crawl-stats-summary] crawl runs list failed', error);
      return emptyRunsPage;
    }),
    getAdminCrawlStatsJobCounts({ waitForFullScan: options?.waitForFullScan }),
  ]);

  const {
    storedActiveJobs,
    storedActiveJobsBySegment,
    activeJobs,
    activeJobsBySegment,
  } = jobCounts;

  const latest = runsPage.runs[0];
  if (!latest) {
    return {
      companyCount,
      companyRegistryBySegment,
      fetched: 0,
      fetchedBySegment: emptyCompanySegmentCounts(),
      closed: 0,
      closedBySegment: emptyCompanySegmentCounts(),
      activeJobs,
      activeJobsBySegment,
      storedActiveJobs,
      storedActiveJobsBySegment,
      lastRun: null,
    };
  }

  const { fetched, fetchedBySegment, closed, closedBySegment } =
    resolveLastRunFetchCloseStats(latest);

  return {
    companyCount,
    companyRegistryBySegment,
    fetched,
    fetchedBySegment,
    closed,
    closedBySegment,
    activeJobs,
    activeJobsBySegment,
    storedActiveJobs,
    storedActiveJobsBySegment,
    lastRun: {
      finishedAt: latest.finishedAt || latest.startedAt,
      runKind: latest.runKind,
      sourceCount: latest.sources.length,
      errorSourceCount: countErrorSources(latest.sources),
    },
  };
}

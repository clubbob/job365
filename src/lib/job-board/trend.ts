import { inferJobRoles } from '@/lib/crawler/map-fields';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import {
  JOB_BOARD_COMPANY_SEGMENTS,
  primaryCompanySegmentForJob,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';
import {
  EMPLOYMENT_TYPES,
  JOB_LIST_PAGE_SIZE,
  JOB_REGIONS,
  JOB_ROLES,
  isEmploymentType,
  isJobRegion,
  type EmploymentType,
  type JobRegion,
  type JobRole,
} from '@/lib/job-board/constants';
import type { CrawledJobListItem } from '@/types/crawled-job';

export const JOB_BOARD_TREND_MIN_PREVIOUS = 20;

export type JobBoardTrendSnapshot = {
  at: string;
  day: string;
  total: number;
  regions: Record<JobRegion, number>;
  roles: Record<JobRole, number>;
  companySegments: Record<JobBoardCompanySegment, number>;
  employmentTypes: Record<EmploymentType, number>;
};

export type JobBoardTrendBar = {
  key: string;
  label: string;
  count: number;
  previousCount: number | null;
  delta: number | null;
  queryKey: 'region' | 'role' | 'companySegment' | 'employmentType';
  highlight: boolean;
};

export type JobBoardTrendGroupId = 'companySegments' | 'employmentTypes' | 'roles' | 'regions';

export type JobBoardTrendGroup = {
  id: JobBoardTrendGroupId;
  label: string;
  bars: JobBoardTrendBar[];
};

export type JobBoardTrendLastCrawl = {
  finishedAt: string;
  runKind: 'daily' | 'mid-sized-only';
  added: number;
  closed: number;
  net: number;
};

export type JobBoardTrendRunPoint = {
  at: string;
  net: number;
};

export type JobBoardTrendView = {
  total: number;
  previousTotal: number | null;
  totalDelta: number | null;
  computedAt: string;
  previousAt: string | null;
  hasComparison: boolean;
  historyTotals: { day: string; total: number }[];
  movers: JobBoardTrendBar[];
  groups: JobBoardTrendGroup[];
  lastCrawl: JobBoardTrendLastCrawl | null;
  recentNets: JobBoardTrendRunPoint[];
};

export function crawlRunKindLabel(kind: JobBoardTrendLastCrawl['runKind']): string {
  return kind === 'mid-sized-only' ? '중견기업 수집' : '정기 수집';
}

type CrawlRunFlowInput = {
  runKind: JobBoardTrendLastCrawl['runKind'];
  finishedAt: string;
  startedAt: string;
  totalUpserted: number;
  totalClosed: number;
};

export function crawlFlowFromRuns(runs: CrawlRunFlowInput[]): {
  lastCrawl: JobBoardTrendLastCrawl | null;
  recentNets: JobBoardTrendRunPoint[];
} {
  if (runs.length === 0) return { lastCrawl: null, recentNets: [] };
  const latest = runs[0]!;
  const recentNets = [...runs]
    .reverse()
    .map((run) => ({
      at: run.finishedAt || run.startedAt,
      net: run.totalUpserted - run.totalClosed,
    }))
    .filter((item) => item.at);

  return {
    lastCrawl: {
      finishedAt: latest.finishedAt || latest.startedAt,
      runKind: latest.runKind,
      added: latest.totalUpserted,
      closed: latest.totalClosed,
      net: latest.totalUpserted - latest.totalClosed,
    },
    recentNets,
  };
}

type TrendJob = Pick<
  CrawledJobListItem,
  'title' | 'companyName' | 'companySize' | 'employmentTypes' | 'regions' | 'sourceId'
>;

function emptyRegionCounts(): Record<JobRegion, number> {
  return Object.fromEntries(JOB_REGIONS.map((key) => [key, 0])) as Record<JobRegion, number>;
}

function emptyRoleCounts(): Record<JobRole, number> {
  return Object.fromEntries(JOB_ROLES.map((key) => [key, 0])) as Record<JobRole, number>;
}

function emptyEmploymentCounts(): Record<EmploymentType, number> {
  return Object.fromEntries(EMPLOYMENT_TYPES.map((key) => [key, 0])) as Record<
    EmploymentType,
    number
  >;
}

function emptySegmentCounts(): Record<JobBoardCompanySegment, number> {
  return Object.fromEntries(JOB_BOARD_COMPANY_SEGMENTS.map((key) => [key, 0])) as Record<
    JobBoardCompanySegment,
    number
  >;
}

export function emptyJobBoardTrendSnapshot(at = new Date().toISOString()): JobBoardTrendSnapshot {
  return {
    at,
    day: getKoreaDateLocalToday(new Date(at)),
    total: 0,
    regions: emptyRegionCounts(),
    roles: emptyRoleCounts(),
    companySegments: emptySegmentCounts(),
    employmentTypes: emptyEmploymentCounts(),
  };
}

export function countJobBoardTrendSnapshot(jobs: TrendJob[]): JobBoardTrendSnapshot {
  const snapshot = emptyJobBoardTrendSnapshot();
  snapshot.total = jobs.length;
  for (const job of jobs) {
    snapshot.companySegments[primaryCompanySegmentForJob(job)] += 1;
    for (const region of job.regions) {
      if (isJobRegion(region)) snapshot.regions[region] += 1;
    }
    for (const role of inferJobRoles(job.title, undefined, job.companyName)) {
      snapshot.roles[role] += 1;
    }
    for (const type of job.employmentTypes) {
      if (isEmploymentType(type)) snapshot.employmentTypes[type] += 1;
    }
  }
  return snapshot;
}

function barDelta(
  count: number,
  previousCount: number | null,
): { delta: number | null; highlight: boolean } {
  if (previousCount == null) return { delta: null, highlight: false };
  const delta = count - previousCount;
  const highlight = previousCount >= JOB_BOARD_TREND_MIN_PREVIOUS && Math.abs(delta) >= 10;
  return { delta, highlight };
}

function toBars<K extends string>(
  keys: readonly K[],
  live: Record<K, number>,
  previous: Record<K, number> | null,
  queryKey: JobBoardTrendBar['queryKey'],
): JobBoardTrendBar[] {
  const bars: JobBoardTrendBar[] = keys.map((key) => {
    const count = live[key] ?? 0;
    const previousCount = previous ? (previous[key] ?? 0) : null;
    const { delta, highlight } = barDelta(count, previousCount);
    return {
      key,
      label: key,
      count,
      previousCount,
      delta,
      queryKey,
      highlight,
    };
  });
  bars.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
  return bars;
}

export function buildJobBoardTrendView(
  live: JobBoardTrendSnapshot,
  previous: JobBoardTrendSnapshot | null,
  history: JobBoardTrendSnapshot[],
): JobBoardTrendView {
  const hasComparison = Boolean(previous);
  const groups: JobBoardTrendGroup[] = [
    {
      id: 'companySegments',
      label: '회사 분류',
      bars: toBars(
        JOB_BOARD_COMPANY_SEGMENTS,
        live.companySegments,
        previous?.companySegments ?? null,
        'companySegment',
      ),
    },
    {
      id: 'employmentTypes',
      label: '채용 형태',
      bars: toBars(
        EMPLOYMENT_TYPES,
        live.employmentTypes,
        previous?.employmentTypes ?? null,
        'employmentType',
      ),
    },
    {
      id: 'roles',
      label: '직무',
      bars: toBars(JOB_ROLES, live.roles, previous?.roles ?? null, 'role'),
    },
    {
      id: 'regions',
      label: '지역',
      bars: toBars(JOB_REGIONS, live.regions, previous?.regions ?? null, 'region'),
    },
  ];

  const movers = groups
    .filter((group) => group.id !== 'companySegments')
    .flatMap((group) => group.bars)
    .filter(
      (bar) =>
        bar.delta != null &&
        bar.delta > 0 &&
        (bar.previousCount ?? 0) >= JOB_BOARD_TREND_MIN_PREVIOUS,
    )
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0) || b.count - a.count)
    .slice(0, 4);

  const historyTotals = [...history]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((item) => ({ day: item.day, total: item.total }));
  const lastHistoryDay = historyTotals[historyTotals.length - 1]?.day;
  if (lastHistoryDay !== live.day) {
    historyTotals.push({ day: live.day, total: live.total });
  } else {
    historyTotals[historyTotals.length - 1] = { day: live.day, total: live.total };
  }

  return {
    total: live.total,
    previousTotal: previous?.total ?? null,
    totalDelta: previous ? live.total - previous.total : null,
    computedAt: live.at,
    previousAt: previous?.at ?? null,
    hasComparison,
    historyTotals,
    movers,
    groups,
    lastCrawl: null,
    recentNets: [],
  };
}

export function jobBoardHrefFromTrendBar(bar: JobBoardTrendBar): string {
  const params = new URLSearchParams();
  params.append(bar.queryKey, bar.key);
  params.set('page', '1');
  params.set('pageSize', String(JOB_LIST_PAGE_SIZE));
  return `/jobs?${params.toString()}`;
}

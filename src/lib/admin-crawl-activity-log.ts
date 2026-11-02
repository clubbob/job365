import {
  ADMIN_CRAWL_RUNS_RETENTION_DAYS,
} from '@/lib/admin-constants';
import type { CrawlRunListItem } from '@/lib/crawl-runs-server';
import type { CrawlStatsDailySnapshot } from '@/lib/crawl-stats-daily-server';
import { countFetchedBySegmentFromRunSources } from '@/lib/crawler/crawl-fetched-by-segment';
import { sumCompanySegmentCounts } from '@/lib/job-board/company-segment';

export type AdminCrawlRunLogRow = {
  id: string;
  startedAt: string;
  finishedAt: string;
  runKind: CrawlRunListItem['runKind'];
  runKindLabel: string;
  totalUpserted: number;
  totalClosed: number;
  netChange: number;
  fetchedTotal: number;
  errorSourceCount: number;
  statusNote: string;
};

export type AdminCrawlDailyLogRow = {
  day: string;
  capturedAt: string;
  capturedBefore: CrawlStatsDailySnapshot['capturedBefore'];
  capturedBeforeLabel: string;
  activeJobs: number;
  storedActiveJobs: number;
  unsuitableJobs: number;
};

export function countCrawlRunErrorSources(sources: CrawlRunListItem['sources']): number {
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

function runKindLabel(runKind: CrawlRunListItem['runKind']): string {
  return runKind === 'mid-sized-only' ? '중견 배치' : '정기 수집';
}

function capturedBeforeLabel(source: CrawlStatsDailySnapshot['capturedBefore']): string {
  switch (source) {
    case 'crawl':
      return '수집 직전';
    case 'cron':
      return '예약 작업';
    default:
      return '통계 요약';
  }
}

function firstMeaningfulRunError(sources: CrawlRunListItem['sources']): string | null {
  for (const source of sources) {
    for (const line of source.errors) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('DB 배치:')) continue;
      if (t.startsWith('고용24')) continue;
      if (t.includes('WORK24_AUTH_KEY')) continue;
      return t;
    }
  }
  return null;
}

function buildRunStatusNote(run: CrawlRunListItem, errorSourceCount: number): string {
  if (errorSourceCount > 0) {
    const detail = firstMeaningfulRunError(run.sources);
    return detail ? `오류 소스 ${errorSourceCount}곳 · ${detail}` : `오류 소스 ${errorSourceCount}곳`;
  }
  if (run.totalUpserted === 0 && run.totalClosed === 0) return '변동 없음';
  return '완료';
}

function fetchedTotalForRun(run: CrawlRunListItem): number {
  const bySegment =
    run.fetchedBySegment ?? countFetchedBySegmentFromRunSources(run.sources);
  return sumCompanySegmentCounts(bySegment);
}

export function mapCrawlRunToLogRow(run: CrawlRunListItem): AdminCrawlRunLogRow {
  const fetchedTotal = fetchedTotalForRun(run);
  const errorSourceCount = countCrawlRunErrorSources(run.sources);
  return {
    id: run.id,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    runKind: run.runKind,
    runKindLabel: runKindLabel(run.runKind),
    totalUpserted: run.totalUpserted,
    totalClosed: run.totalClosed,
    netChange: run.totalUpserted - run.totalClosed,
    fetchedTotal,
    errorSourceCount,
    statusNote: buildRunStatusNote(run, errorSourceCount),
  };
}

export function mapDailySnapshotToLogRow(snapshot: CrawlStatsDailySnapshot): AdminCrawlDailyLogRow {
  const { summary } = snapshot;
  return {
    day: snapshot.day,
    capturedAt: snapshot.capturedAt,
    capturedBefore: snapshot.capturedBefore,
    capturedBeforeLabel: capturedBeforeLabel(snapshot.capturedBefore),
    activeJobs: summary.activeJobs,
    storedActiveJobs: summary.storedActiveJobs,
    unsuitableJobs: Math.max(0, summary.storedActiveJobs - summary.activeJobs),
  };
}

export type AdminCrawlActivityLogPayload = {
  runs: AdminCrawlRunLogRow[];
  daily: AdminCrawlDailyLogRow[];
  retentionDays: number;
};

export function buildAdminCrawlActivityLogPayload(
  runs: CrawlRunListItem[],
  daily: CrawlStatsDailySnapshot[],
): AdminCrawlActivityLogPayload {
  return {
    runs: runs.map(mapCrawlRunToLogRow),
    daily: [...daily].reverse().map(mapDailySnapshotToLogRow),
    retentionDays: ADMIN_CRAWL_RUNS_RETENTION_DAYS,
  };
}

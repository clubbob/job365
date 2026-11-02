import {
  ADMIN_CRAWL_RUNS_RETENTION_DAYS,
} from '@/lib/admin-constants';
import type { CrawlRunListItem } from '@/lib/crawl-runs-server';
import { countFetchedBySegmentFromRunSources } from '@/lib/crawler/crawl-fetched-by-segment';
import { countCrawlRunErrorSources } from '@/lib/crawler/crawl-run-log';
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

function runKindLabel(runKind: CrawlRunListItem['runKind']): string {
  return runKind === 'mid-sized-only' ? '중견 배치' : '정기 수집';
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
  const errorSourceCount =
    typeof run.errorSourceCount === 'number'
      ? run.errorSourceCount
      : countCrawlRunErrorSources(run.sources);
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

export type AdminCrawlActivityLogPayload = {
  runs: AdminCrawlRunLogRow[];
  retentionDays: number;
};

export function buildAdminCrawlActivityLogPayload(
  runs: CrawlRunListItem[],
): AdminCrawlActivityLogPayload {
  return {
    runs: runs.map(mapCrawlRunToLogRow),
    retentionDays: ADMIN_CRAWL_RUNS_RETENTION_DAYS,
  };
}

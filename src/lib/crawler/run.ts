import { closeExpiredCrawledJobs, listActiveJobIdsBySource, markCrawledJobsClosed, upsertCrawledJob } from '@/lib/crawled-jobs-server';
import { crawlKakaoCareers } from '@/lib/crawler/sources/kakao';
import type { CrawlRunSummary, CrawlerSourceResult } from '@/lib/crawler/types';
import { saveCrawlRun } from '@/lib/crawl-runs-server';
import { getKoreaDateLocalToday } from '@/lib/datetime';

const SOURCES = [crawlKakaoCareers];

async function syncSource(result: CrawlerSourceResult) {
  const seenIds = new Set(result.jobs.map((job) => job.id));
  let upserted = 0;

  for (const job of result.jobs) {
    await upsertCrawledJob(job);
    upserted += 1;
  }

  const activeIds = await listActiveJobIdsBySource(result.sourceId);
  const staleIds = activeIds.filter((id) => !seenIds.has(id));
  const closed = await markCrawledJobsClosed(staleIds, new Date().toISOString());

  return { fetched: result.jobs.length, upserted, closed, errors: result.errors };
}

export async function runCrawlPipeline(): Promise<CrawlRunSummary> {
  const startedAt = new Date().toISOString();
  const sourceSummaries = [];
  let totalUpserted = 0;
  let totalClosed = 0;

  for (const crawl of SOURCES) {
    const result = await crawl();
    const summary = await syncSource(result);
    sourceSummaries.push({
      sourceId: result.sourceId,
      sourceName: result.sourceName,
      ...summary,
    });
    totalUpserted += summary.upserted;
    totalClosed += summary.closed;
  }

  const expiredClosed = await closeExpiredCrawledJobs(getKoreaDateLocalToday());
  totalClosed += expiredClosed;

  const finishedAt = new Date().toISOString();
  const run: CrawlRunSummary = {
    startedAt,
    finishedAt,
    sources: sourceSummaries,
    totalUpserted,
    totalClosed,
  };

  await saveCrawlRun(run);
  return run;
}

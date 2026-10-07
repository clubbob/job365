import { isCompanyCrawlDisabled } from '@/lib/crawl-company-policy-server';
import { isCrawlDisabled } from '@/lib/crawl-source-policy-server';
import { closeExpiredCrawledJobs, listActiveJobIdsBySource, markCrawledJobsClosed, upsertCrawledJob } from '@/lib/crawled-jobs-server';
import { closeBrowserCrawlSession } from '@/lib/crawler/browser-page-crawl';
import { pauseBetweenCrawlSources } from '@/lib/crawler/crawl-throttle';
import { isCareersUrlRobotsAllowed } from '@/lib/crawler/robots';
import { getCompanyCrawlers } from '@/lib/crawler/registry';
import type { CrawlRunSummary, CrawlerSourceResult } from '@/lib/crawler/types';
import { saveCrawlRun } from '@/lib/crawl-runs-server';
import { getKoreaDateLocalToday } from '@/lib/datetime';

function shouldSyncSource(result: CrawlerSourceResult): boolean {
  if (result.jobs.length > 0) return true;
  if (result.syncEmpty) return true;
  // 목록이 비었어도 수집 자체는 성공한 경우(현재 진행 공고 0건)만 동기화합니다.
  return result.errors.length === 0;
}

async function syncSource(result: CrawlerSourceResult) {
  const seenIds = new Set(result.jobs.map((job) => job.id));
  let upserted = 0;

  for (const job of result.jobs) {
    if (await isCompanyCrawlDisabled(job.sourceId, job.companyName)) {
      seenIds.add(job.id);
      continue;
    }
    const writeResult = await upsertCrawledJob(job);
    if (writeResult !== 'unchanged') upserted += 1;
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

  try {
    let isFirstSource = true;
    for (const { company, crawl } of getCompanyCrawlers()) {
      if (!isFirstSource) {
        await pauseBetweenCrawlSources();
      }
      isFirstSource = false;

      try {
        if (await isCrawlDisabled(company.sourceId)) {
          sourceSummaries.push({
            sourceId: company.sourceId,
            sourceName: company.sourceName,
            fetched: 0,
            upserted: 0,
            closed: 0,
            errors: ['관리자에 의해 수집이 중단된 소스입니다.'],
          });
          continue;
        }

        if (!(await isCareersUrlRobotsAllowed(company.careersUrl))) {
          sourceSummaries.push({
            sourceId: company.sourceId,
            sourceName: company.sourceName,
            fetched: 0,
            upserted: 0,
            closed: 0,
            errors: ['robots.txt 정책상 수집이 허용되지 않습니다.'],
          });
          continue;
        }

        const result = await crawl();

        if (shouldSyncSource(result)) {
          const summary = await syncSource(result);
          sourceSummaries.push({
            sourceId: result.sourceId,
            sourceName: result.sourceName,
            ...summary,
          });
          totalUpserted += summary.upserted;
          totalClosed += summary.closed;
        } else {
          sourceSummaries.push({
            sourceId: company.sourceId,
            sourceName: company.sourceName,
            fetched: 0,
            upserted: 0,
            closed: 0,
            errors: result.errors.length > 0 ? result.errors : ['수집에 실패했습니다. 다음 수집 때 다시 시도합니다.'],
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '수집 실패';
        console.error(`[crawl] ${company.sourceName} 실패:`, message);
        sourceSummaries.push({
          sourceId: company.sourceId,
          sourceName: company.sourceName,
          fetched: 0,
          upserted: 0,
          closed: 0,
          errors: [message],
        });
      } finally {
        await closeBrowserCrawlSession();
      }
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
  } finally {
    await closeBrowserCrawlSession();
  }
}

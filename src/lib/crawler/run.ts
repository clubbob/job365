import { isCompanyCrawlDisabled } from '@/lib/crawl-company-policy-server';
import { isCrawlDisabled } from '@/lib/crawl-source-policy-server';
import {
  closeExpiredCrawledJobs,
  invalidateCrawledJobsListCache,
  listActiveJobIdsBySource,
  markCrawledJobsClosed,
  purgeClosedCrawledJobsPastRetention,
  refreshFirestoreStatsAfterCrawl,
  upsertCrawledJob,
} from '@/lib/crawled-jobs-server';
import { closeBrowserCrawlSession } from '@/lib/crawler/browser-page-crawl';
import { pauseBetweenCrawlSources } from '@/lib/crawler/crawl-throttle';
import { isCareersUrlRobotsAllowed } from '@/lib/crawler/robots';
import { crawlMidSizedRegistryBatch } from '@/lib/crawler/adapters/mid-sized-registry-batch';
import {
  crawlItSeedCareersRegistryBatch,
  crawlSemiSeedCareersRegistryBatch,
} from '@/lib/crawler/adapters/seed-careers-registry-batch';
import { getCompanyCrawlersForRun } from '@/lib/crawler/registry';
import { sourceCrawlTimeoutMs, withCrawlTimeout } from '@/lib/crawler/crawl-timeout';
import { shouldSyncCrawlSourceResult } from '@/lib/crawler/should-sync-source';
import type {
  CrawlRunSummary,
  CrawlSourceResultSink,
  CrawlerSourceResult,
} from '@/lib/crawler/types';
import { emptyCompanySegmentCounts, type JobBoardCompanySegment } from '@/lib/job-board/company-segment';
import { addJobsToPrimaryCompanySegmentCounts } from '@/lib/job-board/stored-active-segment-stats';
import type { CrawledJob } from '@/types/crawled-job';
import { captureCrawlStatsDailyBeforeCrawl } from '@/lib/crawl-stats-daily-server';
import { saveCrawlRun } from '@/lib/crawl-runs-server';
import { getKoreaDateLocalToday } from '@/lib/datetime';

async function syncSourceForId(
  sourceId: string,
  sourceName: string,
  jobs: CrawlerSourceResult['jobs'],
  errors: string[],
  closedBySegment: Record<JobBoardCompanySegment, number>,
) {
  const seenIds = new Set(jobs.map((job) => job.id));
  let upserted = 0;

  for (const job of jobs) {
    try {
      if (await isCompanyCrawlDisabled(job.sourceId, job.companyName)) {
        seenIds.add(job.id);
        continue;
      }
      const writeResult = await upsertCrawledJob(job);
      if (writeResult !== 'unchanged') upserted += 1;
    } catch (error) {
      seenIds.add(job.id);
      console.warn(
        `[crawl] 공고 저장 실패 (${job.id}):`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  let closed = 0;
  try {
    const activeIds = await listActiveJobIdsBySource(sourceId);
    const staleIds = activeIds.filter((id) => !seenIds.has(id));
    closed = await markCrawledJobsClosed(staleIds, new Date().toISOString(), closedBySegment);
  } catch (error) {
    console.warn(
      `[crawl] 마감 처리 실패 (${sourceId}):`,
      error instanceof Error ? error.message : error,
    );
  }

  return { sourceId, sourceName, fetched: jobs.length, upserted, closed, errors };
}

async function syncSource(
  result: CrawlerSourceResult,
  closedBySegment: Record<JobBoardCompanySegment, number>,
) {
  const bySource = new Map<string, CrawlerSourceResult['jobs']>();
  for (const job of result.jobs) {
    const list = bySource.get(job.sourceId) ?? [];
    list.push(job);
    bySource.set(job.sourceId, list);
  }

  if (bySource.size <= 1) {
    const summary = await syncSourceForId(
      result.sourceId,
      result.sourceName,
      result.jobs,
      result.errors,
      closedBySegment,
    );
    return {
      fetched: summary.fetched,
      upserted: summary.upserted,
      closed: summary.closed,
      errors: summary.errors,
    };
  }

  let fetched = 0;
  let upserted = 0;
  let closed = 0;
  const errors = [...result.errors];
  for (const [sourceId, jobs] of bySource) {
    const name = jobs[0]?.companyName ? `${jobs[0].companyName} 채용` : result.sourceName;
    const summary = await syncSourceForId(sourceId, name, jobs, [], closedBySegment);
    fetched += summary.fetched;
    upserted += summary.upserted;
    closed += summary.closed;
    errors.push(...summary.errors);
  }
  return { fetched, upserted, closed, errors };
}

function createIncrementalSyncAccumulator(closedBySegment: Record<JobBoardCompanySegment, number>) {
  const jobsBySource = new Map<string, { sourceName: string; jobs: Map<string, CrawledJob> }>();
  let fetched = 0;
  let upserted = 0;
  let closed = 0;

  const sink: CrawlSourceResultSink = async (result) => {
    try {
      let bucket = jobsBySource.get(result.sourceId);
      if (!bucket) {
        bucket = { sourceName: result.sourceName, jobs: new Map() };
        jobsBySource.set(result.sourceId, bucket);
      }
      bucket.sourceName = result.sourceName;
      for (const job of result.jobs) {
        bucket.jobs.set(job.id, job);
      }

      const mergedJobs = [...bucket.jobs.values()];
      const payload: CrawlerSourceResult = {
        sourceId: result.sourceId,
        sourceName: bucket.sourceName,
        jobs: mergedJobs,
        errors: result.errors,
        syncEmpty: result.syncEmpty ?? (mergedJobs.length === 0 && result.errors.length === 0),
      };
      if (!shouldSyncCrawlSourceResult(payload)) return;

      fetched += result.jobs.length;
      const summary = await syncSourceForId(
        result.sourceId,
        bucket.sourceName,
        mergedJobs,
        result.errors,
        closedBySegment,
      );
      upserted += summary.upserted;
      closed += summary.closed;
      if (summary.upserted > 0 || summary.closed > 0) {
        invalidateCrawledJobsListCache();
      }
    } catch (error) {
      console.error(
        `[crawl] 회사별 저장 실패 (${result.sourceId}):`,
        error instanceof Error ? error.message : error,
      );
    }
  };

  return {
    sink,
    getTotals: () => ({ fetched, upserted, closed }),
  };
}

export async function runCrawlPipeline(): Promise<CrawlRunSummary> {
  const startedAt = new Date().toISOString();
  const sourceSummaries: CrawlRunSummary['sources'] = [];
  const fetchedBySegment = emptyCompanySegmentCounts();
  const closedBySegment = emptyCompanySegmentCounts();
  let totalUpserted = 0;
  let totalClosed = 0;
  let pipelineError: string | undefined;

  const countFetchedJobs = (jobs: CrawlerSourceResult['jobs']) => {
    addJobsToPrimaryCompanySegmentCounts(fetchedBySegment, jobs);
  };

  try {
    try {
      await captureCrawlStatsDailyBeforeCrawl();
    } catch (error) {
      console.warn('[crawl] 수집 전 통계 스냅샷 실패', error);
    }

    let isFirstSource = true;
    for (const { company, crawl } of getCompanyCrawlersForRun()) {
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

        if (
          company.adapter !== 'mid-sized-registry-batch' &&
          !(await isCareersUrlRobotsAllowed(company.careersUrl))
        ) {
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

        let result: CrawlerSourceResult;
        if (company.adapter === 'mid-sized-registry-batch') {
          const incremental = createIncrementalSyncAccumulator(closedBySegment);
          try {
            result = await crawlMidSizedRegistryBatch({ onSourceResult: incremental.sink });
          } catch (error) {
            const message = error instanceof Error ? error.message : '중견 배치 수집 실패';
            result = {
              sourceId: 'mid-sized-registry-batch-careers',
              sourceName: '중견기업 DB 수집',
              jobs: [],
              errors: [message],
            };
          }
          countFetchedJobs(result.jobs);
          const totals = incremental.getTotals();
          sourceSummaries.push({
            sourceId: result.sourceId,
            sourceName: result.sourceName,
            fetched: totals.fetched,
            upserted: totals.upserted,
            closed: totals.closed,
            errors: result.errors,
          });
          totalUpserted += totals.upserted;
          totalClosed += totals.closed;
          continue;
        }

        if (
          company.adapter === 'it-seed-registry-batch' ||
          company.adapter === 'semi-seed-registry-batch'
        ) {
          const incremental = createIncrementalSyncAccumulator(closedBySegment);
          const crawlSeedBatch =
            company.adapter === 'it-seed-registry-batch'
              ? crawlItSeedCareersRegistryBatch
              : crawlSemiSeedCareersRegistryBatch;
          try {
            result = await crawlSeedBatch({ onSourceResult: incremental.sink });
          } catch (error) {
            const message = error instanceof Error ? error.message : '시드 배치 수집 실패';
            result = {
              sourceId: company.sourceId,
              sourceName: company.sourceName,
              jobs: [],
              errors: [message],
            };
          }
          countFetchedJobs(result.jobs);
          const totals = incremental.getTotals();
          sourceSummaries.push({
            sourceId: result.sourceId,
            sourceName: result.sourceName,
            fetched: totals.fetched,
            upserted: totals.upserted,
            closed: totals.closed,
            errors: result.errors,
          });
          totalUpserted += totals.upserted;
          totalClosed += totals.closed;
          continue;
        }

        try {
          result = await withCrawlTimeout(company.sourceName, sourceCrawlTimeoutMs(), crawl);
        } catch (error) {
          const message = error instanceof Error ? error.message : '수집 실패';
          result = {
            sourceId: company.sourceId,
            sourceName: company.sourceName,
            jobs: [],
            errors: [message],
          };
        }

        if (shouldSyncCrawlSourceResult(result)) {
          countFetchedJobs(result.jobs);
          try {
            const summary = await syncSource(result, closedBySegment);
            sourceSummaries.push({
              sourceId: result.sourceId,
              sourceName: result.sourceName,
              ...summary,
            });
            totalUpserted += summary.upserted;
            totalClosed += summary.closed;
          } catch (error) {
            const message = error instanceof Error ? error.message : '저장 실패';
            console.error(`[crawl] ${company.sourceName} 저장 실패:`, message);
            sourceSummaries.push({
              sourceId: result.sourceId,
              sourceName: result.sourceName,
              fetched: result.jobs.length,
              upserted: 0,
              closed: 0,
              errors: [...result.errors, message],
            });
          }
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

    try {
      const expiredClosed = await closeExpiredCrawledJobs(getKoreaDateLocalToday(), closedBySegment);
      totalClosed += expiredClosed;
    } catch (error) {
      console.warn('[crawl] expired job close failed', error);
    }

    try {
      await purgeClosedCrawledJobsPastRetention();
    } catch (error) {
      console.warn('[crawl] closed job purge failed', error);
    }

    if (totalUpserted > 0 || totalClosed > 0) {
      invalidateCrawledJobsListCache();
    }

    try {
      await refreshFirestoreStatsAfterCrawl();
    } catch (error) {
      console.warn('[crawl] post-crawl stats refresh failed', error);
    }
  } catch (error) {
    pipelineError = error instanceof Error ? error.message : '수집 파이프라인 오류';
    console.error('[crawl] pipeline error (partial results kept):', pipelineError);
  } finally {
    await closeBrowserCrawlSession();
  }

  const finishedAt = new Date().toISOString();
  const run: CrawlRunSummary = {
    runKind: process.env.CRAWL_MID_SIZED_ONLY === '1' ? 'mid-sized-only' : 'daily',
    startedAt,
    finishedAt,
    sources: sourceSummaries,
    totalUpserted,
    totalClosed,
    fetchedBySegment,
    closedBySegment,
  };

  if (pipelineError) {
    run.sources.push({
      sourceId: 'crawl-pipeline',
      sourceName: '수집 파이프라인',
      fetched: 0,
      upserted: 0,
      closed: 0,
      errors: [pipelineError],
    });
  }

  try {
    await saveCrawlRun(run);
  } catch (error) {
    console.error('[crawl] save run failed', error);
  }

  return run;
}

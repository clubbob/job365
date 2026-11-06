import { createHash } from 'node:crypto';

import { crawlRegistryCareersRecord } from '@/lib/crawler/adapters/registry-careers-crawl';
import { paceCrawlRequest } from '@/lib/crawler/crawl-throttle';
import { skipRegistryRecordForRobots } from '@/lib/crawler/robots-blocked-extraction';
import {
  countMidSizedCareersConfigs,
  getMidSizedCareersConfigs,
} from '@/lib/crawler/mid-sized-careers-urls';
import { getUniqueMidSizedRegistryForCrawl } from '@/lib/mid-sized-companies/registry-for-crawl';
import { CRAWL_MID_SIZED_SITES_PER_RUN, rotatingBatchStart } from '@/lib/crawler/schedule';
import { isCrawlRunDeadlineReached } from '@/lib/crawler/crawl-deadline';
import type { CrawlBatchOptions, CrawlerSourceResult } from '@/lib/crawler/types';
import type { CrawledJob } from '@/types/crawled-job';

const BATCH_SOURCE_ID = 'mid-sized-registry-batch-careers';
const BATCH_SOURCE_NAME = '중견기업 DB 수집';

/**
 * 중견기업 DB 명단을 읽어, 채용 URL이 있는 회사부터 공고를 수집합니다.
 */
function selectCareersConfigBatch(configs: ReturnType<typeof getMidSizedCareersConfigs>) {
  const batchSize = Math.max(
    1,
    Number(
      process.env.CRAWL_MID_SIZED_DB_BATCH_SIZE ??
        process.env.CRAWL_MID_SIZED_BATCH_SIZE ??
        CRAWL_MID_SIZED_SITES_PER_RUN,
    ) || CRAWL_MID_SIZED_SITES_PER_RUN,
  );
  if (configs.length <= batchSize) return configs;
  const start = rotatingBatchStart(configs.length, batchSize);
  const batch: ReturnType<typeof getMidSizedCareersConfigs> = [];
  for (let i = 0; i < batchSize; i += 1) {
    batch.push(configs[(start + i) % configs.length]);
  }
  return batch;
}

export async function crawlMidSizedRegistryBatch(
  options?: CrawlBatchOptions,
): Promise<CrawlerSourceResult> {
  const registrySize = getUniqueMidSizedRegistryForCrawl().length;
  const allConfigs = getMidSizedCareersConfigs();
  const batch = selectCareersConfigBatch(allConfigs);
  const linkedTotal = countMidSizedCareersConfigs();
  const withUrl = batch;

  const jobs: CrawledJob[] = [];
  const errors: string[] = [];

  if (withUrl.length === 0) {
    return {
      sourceId: BATCH_SOURCE_ID,
      sourceName: BATCH_SOURCE_NAME,
      jobs: [],
      errors: [
        `중견기업 명단 ${registrySize}곳 중 DB에 채용 URL이 없습니다. pnpm preprocess:mid-sized 후 다시 수집하세요.`,
      ],
    };
  }

  errors.push(
    `DB 배치: 명단 ${registrySize}곳 · URL 목록 ${linkedTotal}곳 · 이번 회차 수집 ${withUrl.length}곳`,
  );

  for (const record of withUrl) {
    if (isCrawlRunDeadlineReached()) break;
    if (
      await skipRegistryRecordForRobots({
        crawlSourceId: record.crawlSourceId,
        careersUrl: record.careersUrl,
        companyName: record.name,
      })
    ) {
      continue;
    }
    await paceCrawlRequest();
    try {
      const result = await crawlRegistryCareersRecord({
        companyName: record.name,
        careersUrl: record.careersUrl,
        crawlSourceId: record.crawlSourceId,
        careersAdapter: record.adapter,
        greenhouseBoard: record.greenhouseBoard,
        companySize: '중견기업',
      });
      if (options?.onSourceResult) {
        await options.onSourceResult({
          ...result,
          syncEmpty: result.syncEmpty ?? (result.jobs.length === 0 && result.errors.length === 0),
        });
      }
      jobs.push(...result.jobs);
      if (result.errors.length > 0) {
        errors.push(`${record.name}: ${result.errors.join('; ')}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '수집 실패';
      errors.push(`${record.name}: ${message}`);
    }
  }

  const jobIds = new Set<string>();
  const dedupedJobs = jobs.filter((job) => {
    if (jobIds.has(job.id)) return false;
    jobIds.add(job.id);
    return true;
  });

  return {
    sourceId: BATCH_SOURCE_ID,
    sourceName: BATCH_SOURCE_NAME,
    jobs: dedupedJobs,
    errors,
    syncEmpty: dedupedJobs.length === 0,
  };
}

export function midSizedRegistryBatchJobId(parts: string): string {
  return createHash('sha256').update(parts).digest('hex').slice(0, 24);
}

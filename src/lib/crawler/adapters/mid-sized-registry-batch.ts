import { createHash } from 'node:crypto';

import { crawlGenericHtmlCareers } from '@/lib/crawler/adapters/generic-html';
import { crawlGreenhouseCareers } from '@/lib/crawler/adapters/greenhouse';
import { paceCrawlRequest } from '@/lib/crawler/crawl-throttle';
import {
  countMidSizedCareersConfigs,
  getMidSizedCareersConfigs,
} from '@/lib/crawler/mid-sized-careers-urls';
import { getUniqueMidSizedRegistryForCrawl } from '@/lib/mid-sized-companies/registry-for-crawl';
import type { CrawlerSourceResult } from '@/lib/crawler/types';
import type { CrawledJob } from '@/types/crawled-job';

const BATCH_SOURCE_ID = 'mid-sized-registry-batch-careers';
const BATCH_SOURCE_NAME = '중견기업 DB 수집';

function isGreenhouseUrl(url: string): { board: string } | null {
  const match = url.match(/boards\.greenhouse\.io\/([^/?#]+)/i);
  if (match?.[1]) return { board: match[1] };
  return null;
}

async function crawlOneRecord(record: {
  companyName: string;
  careersUrl: string;
  crawlSourceId: string;
  careersAdapter?: 'generic' | 'greenhouse';
  greenhouseBoard?: string | null;
}): Promise<CrawlerSourceResult> {
  const sourceId = `${record.crawlSourceId}-careers`;
  const sourceName = `${record.companyName} 채용`;
  const ghFromUrl = isGreenhouseUrl(record.careersUrl);
  const board = record.greenhouseBoard ?? ghFromUrl?.board;

  if (record.careersAdapter === 'greenhouse' && board) {
    return crawlGreenhouseCareers({
      sourceId,
      sourceName,
      companyName: record.companyName,
      boardToken: board,
      careersUrl: record.careersUrl,
      koreaOnly: true,
      companySize: '중견기업',
    });
  }

  if (ghFromUrl) {
    return crawlGreenhouseCareers({
      sourceId,
      sourceName,
      companyName: record.companyName,
      boardToken: ghFromUrl.board,
      careersUrl: record.careersUrl,
      koreaOnly: true,
      companySize: '중견기업',
    });
  }

  return crawlGenericHtmlCareers({
    sourceId,
    sourceName,
    companyName: record.companyName,
    careersUrl: record.careersUrl,
    companySize: '중견기업',
  });
}

/**
 * 중견기업 DB 명단을 읽어, 채용 URL이 있는 회사부터 공고를 수집합니다.
 */
function selectCareersConfigBatch(configs: ReturnType<typeof getMidSizedCareersConfigs>) {
  const batchSize = Math.max(
    1,
    Number(process.env.CRAWL_MID_SIZED_DB_BATCH_SIZE ?? process.env.CRAWL_MID_SIZED_BATCH_SIZE ?? 10_000) || 10_000,
  );
  if (configs.length <= batchSize) return configs;
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const day = Math.floor(kst.getTime() / 86_400_000);
  const start = (day * batchSize) % configs.length;
  const batch: ReturnType<typeof getMidSizedCareersConfigs> = [];
  for (let i = 0; i < batchSize; i += 1) {
    batch.push(configs[(start + i) % configs.length]);
  }
  return batch;
}

export async function crawlMidSizedRegistryBatch(): Promise<CrawlerSourceResult> {
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
    await paceCrawlRequest();
    try {
      const result = await crawlOneRecord({
        companyName: record.name,
        careersUrl: record.careersUrl,
        crawlSourceId: record.crawlSourceId,
        careersAdapter: record.adapter,
        greenhouseBoard: record.greenhouseBoard,
      });
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

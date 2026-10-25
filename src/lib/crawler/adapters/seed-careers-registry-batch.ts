import { crawlRegistryCareersRecord } from '@/lib/crawler/adapters/registry-careers-crawl';
import { paceCrawlRequest } from '@/lib/crawler/crawl-throttle';
import {
  countSeedCareersCrawlConfigs,
  getSeedCareersCrawlConfigs,
} from '@/lib/seed-careers/careers-urls';
import { loadSeedCareersRegistryDbCompanies } from '@/lib/seed-careers/registry-db';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';
import type { CrawlBatchOptions, CrawlerSourceResult } from '@/lib/crawler/types';
import type { CrawledJob } from '@/types/crawled-job';

const BATCH_META: Record<
  SeedCareersSegment,
  { sourceId: string; sourceName: string; companySize: '중견기업' | '대기업' }
> = {
  it: {
    sourceId: 'it-seed-registry-batch-careers',
    sourceName: 'IT 회사 DB 수집',
    companySize: '중견기업',
  },
  'semi-equipment': {
    sourceId: 'semi-seed-registry-batch-careers',
    sourceName: '반도체·디스플레이 장비사 DB 수집',
    companySize: '중견기업',
  },
};

const SEGMENT_LABEL: Record<SeedCareersSegment, string> = {
  it: 'IT 회사',
  'semi-equipment': '반도체·디스플레이 장비사',
};

export async function crawlSeedCareersRegistryBatch(
  segment: SeedCareersSegment,
  options?: CrawlBatchOptions,
): Promise<CrawlerSourceResult> {
  const meta = BATCH_META[segment];
  const registrySize = loadSeedCareersRegistryDbCompanies(segment).length;
  const allConfigs = getSeedCareersCrawlConfigs(segment);
  const linkedTotal = countSeedCareersCrawlConfigs(segment);
  const label = SEGMENT_LABEL[segment];

  const jobs: CrawledJob[] = [];
  const errors: string[] = [];

  if (allConfigs.length === 0) {
    return {
      sourceId: meta.sourceId,
      sourceName: meta.sourceName,
      jobs: [],
      errors: [
        `${label} 명단 ${registrySize}곳 중 DB에 채용 URL이 없습니다. discover:seed-careers 후 다시 수집하세요.`,
      ],
    };
  }

  errors.push(
    `${label} DB: 명단 ${registrySize}곳 · URL ${linkedTotal}곳 · 이번 회차 전체 ${allConfigs.length}곳`,
  );

  for (const record of allConfigs) {
    await paceCrawlRequest();
    try {
      const result = await crawlRegistryCareersRecord({
        companyName: record.name,
        careersUrl: record.careersUrl,
        crawlSourceId: record.crawlSourceId,
        careersAdapter: record.adapter,
        greenhouseBoard: record.greenhouseBoard,
        companySize: meta.companySize,
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
    sourceId: meta.sourceId,
    sourceName: meta.sourceName,
    jobs: dedupedJobs,
    errors,
    syncEmpty: dedupedJobs.length === 0,
  };
}

export function crawlItSeedCareersRegistryBatch(options?: CrawlBatchOptions): Promise<CrawlerSourceResult> {
  return crawlSeedCareersRegistryBatch('it', options);
}

export function crawlSemiSeedCareersRegistryBatch(
  options?: CrawlBatchOptions,
): Promise<CrawlerSourceResult> {
  return crawlSeedCareersRegistryBatch('semi-equipment', options);
}

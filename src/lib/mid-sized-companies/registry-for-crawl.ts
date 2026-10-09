import { countMidSizedCareersConfigs } from '@/lib/crawler/mid-sized-careers-urls';
import { CRAWL_MID_SIZED_SITES_PER_RUN } from '@/lib/crawler/schedule';
import {
  loadMidSizedRegistryDbCompanies,
  type MidSizedRegistryDbCompany,
} from '@/lib/mid-sized-companies/registry-db';

export type MidSizedRegistryCrawlRecord = MidSizedRegistryDbCompany;

/** 중견기업 DB 파일(data/mid-sized-registry-db.json) 기준 수집 명단 */
export function getUniqueMidSizedRegistryForCrawl(): MidSizedRegistryCrawlRecord[] {
  return loadMidSizedRegistryDbCompanies();
}

export function selectMidSizedDbBatch(records: MidSizedRegistryCrawlRecord[]): MidSizedRegistryCrawlRecord[] {
  const batchSize = Math.max(
    1,
    Number(
      process.env.CRAWL_MID_SIZED_DB_BATCH_SIZE ??
        process.env.CRAWL_MID_SIZED_BATCH_SIZE ??
        CRAWL_MID_SIZED_SITES_PER_RUN,
    ) || CRAWL_MID_SIZED_SITES_PER_RUN,
  );
  if (records.length <= batchSize) return records;

  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const day = Math.floor(kst.getTime() / 86_400_000);
  const start = (day * batchSize) % records.length;
  const batch: MidSizedRegistryCrawlRecord[] = [];
  for (let i = 0; i < batchSize; i += 1) {
    batch.push(records[(start + i) % records.length]);
  }
  return batch;
}

export function countMidSizedWithCareersUrl(_records?: MidSizedRegistryCrawlRecord[]): number {
  return countMidSizedCareersConfigs();
}

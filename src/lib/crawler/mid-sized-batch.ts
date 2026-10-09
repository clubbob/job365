import type { CrawlerCompany } from '@/lib/crawler/companies';

/** 연결 URL 약 6,065곳을 7일에 한 바퀴(하루 900). 환경 변수로 조절 가능. */
const DEFAULT_BATCH_SIZE = 900;

function dayIndexKst(): number {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return Math.floor(kst.getTime() / 86_400_000);
}

/** 중견기업 수집은 한 번에 전부 돌리지 않고 일별 배치로 순환합니다. */
export function selectCompaniesForCrawlRun(companies: CrawlerCompany[]): CrawlerCompany[] {
  const batchSize = Math.max(
    50,
    Number(process.env.CRAWL_MID_SIZED_BATCH_SIZE ?? DEFAULT_BATCH_SIZE) || DEFAULT_BATCH_SIZE,
  );
  const enterprise = companies.filter((item) => item.tier !== 'mid-sized');
  const midSized = companies.filter((item) => item.tier === 'mid-sized');

  if (midSized.length <= batchSize) {
    return [...enterprise, ...midSized];
  }

  const start = (dayIndexKst() * batchSize) % midSized.length;
  const batch: CrawlerCompany[] = [];
  for (let i = 0; i < batchSize; i += 1) {
    batch.push(midSized[(start + i) % midSized.length]);
  }

  return [...enterprise, ...batch];
}

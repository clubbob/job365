import { getCrawlerCompanies } from '@/lib/crawler/companies';
import { isItComputingCompany, isItComputingCompanyName } from '@/lib/it-companies/catalog';
import { loadMidSizedCrawlTargets } from '@/lib/mid-sized-companies/crawl-targets';

export type CrawlCollectionSegmentFlags = {
  enterprise: boolean;
  midSized: boolean;
  it: boolean;
};

/** 수집 실행 로그의 sourceId·소스명을 관리자 구분(대기업·중견·IT)에 매핑합니다. */
export function classifyCrawlSourceCollection(sourceId: string, sourceName: string): CrawlCollectionSegmentFlags {
  const id = sourceId.trim();
  const name = sourceName.trim();

  const crawler = getCrawlerCompanies().find((item) => item.sourceId === id);
  if (crawler) {
    return {
      enterprise: crawler.tier === 'enterprise',
      midSized: crawler.tier === 'mid-sized',
      it: isItComputingCompanyName(crawler.name),
    };
  }

  if (id.startsWith('mid-')) {
    const label = name.replace(/\s*채용\s*$/u, '').trim();
    return {
      enterprise: false,
      midSized: true,
      it: isItComputingCompanyName(label),
    };
  }

  const crawlSourceId = id.endsWith('-careers') ? id.slice(0, -'-careers'.length) : id;
  const midTarget = loadMidSizedCrawlTargets().find((item) => item.crawlSourceId === crawlSourceId);
  if (midTarget) {
    return {
      enterprise: false,
      midSized: true,
      it: isItComputingCompany(midTarget.name, null),
    };
  }

  const label = name.replace(/\s*채용\s*$/u, '').trim();
  return {
    enterprise: false,
    midSized: false,
    it: isItComputingCompanyName(label),
  };
}

import { crawlGreenhouseCareers } from '@/lib/crawler/adapters/greenhouse';
import { crawlHyundaiCareers } from '@/lib/crawler/adapters/hyundai';
import { crawlHanwhaCareers, crawlPoscoCareers, crawlSkCareers } from '@/lib/crawler/adapters/pending';
import { crawlLgCareers } from '@/lib/crawler/adapters/lg';
import { crawlSamsungCareers } from '@/lib/crawler/adapters/samsung';
import { getCrawlerCompanies, type CrawlerAdapterId, type CrawlerCompany } from '@/lib/crawler/companies';
import { crawlKakaoCareers } from '@/lib/crawler/sources/kakao';
import { crawlNaverCareers } from '@/lib/crawler/sources/naver';
import type { CrawlerSourceResult } from '@/lib/crawler/types';

export type CrawlerFn = () => Promise<CrawlerSourceResult>;

export type CompanyCrawler = {
  company: CrawlerCompany;
  crawl: CrawlerFn;
};

const SINGLETON_ADAPTERS: Partial<Record<CrawlerAdapterId, CrawlerFn>> = {
  kakao: crawlKakaoCareers,
  naver: crawlNaverCareers,
  lg: crawlLgCareers,
  samsung: crawlSamsungCareers,
  hyundai: crawlHyundaiCareers,
  hanwha: crawlHanwhaCareers,
  sk: crawlSkCareers,
  posco: crawlPoscoCareers,
};

function greenhouseCrawler(company: CrawlerCompany): CrawlerFn {
  return () =>
    crawlGreenhouseCareers({
      sourceId: company.sourceId,
      sourceName: company.sourceName,
      companyName: company.name,
      boardToken: company.greenhouseBoard!,
      careersUrl: company.careersUrl,
      koreaOnly: company.koreaOnly,
    });
}

function unimplementedCrawler(company: CrawlerCompany): CrawlerFn {
  return async () => ({
    sourceId: company.sourceId,
    sourceName: company.sourceName,
    jobs: [],
    errors: [`${company.name}: 수집기가 연결되지 않았습니다.`],
  });
}

function resolveCrawler(company: CrawlerCompany): CrawlerFn {
  if (company.adapter === 'greenhouse') {
    if (!company.greenhouseBoard) return unimplementedCrawler(company);
    return greenhouseCrawler(company);
  }

  const crawl = SINGLETON_ADAPTERS[company.adapter];
  return crawl ?? unimplementedCrawler(company);
}

/** 등록된 기업마다 하나의 수집 함수를 반환합니다. 우선순위·enabled 없이 전부 시도합니다. */
export function getCompanyCrawlers(): CompanyCrawler[] {
  const usedSingletons = new Set<CrawlerAdapterId>();

  return getCrawlerCompanies().map((company) => {
    if (company.adapter === 'greenhouse') {
      return { company, crawl: resolveCrawler(company) };
    }

    if (!usedSingletons.has(company.adapter)) {
      usedSingletons.add(company.adapter);
      return { company, crawl: resolveCrawler(company) };
    }

    return { company, crawl: unimplementedCrawler(company) };
  });
}

/** @deprecated getCompanyCrawlers()를 사용하세요. */
export function getEnabledCrawlers(): CrawlerFn[] {
  return getCompanyCrawlers().map((entry) => entry.crawl);
}

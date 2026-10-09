import { ENTERPRISE_CAREERS_CONFIGS } from '@/lib/crawler/enterprise-careers-urls';
import {
  countMidSizedCareersConfigs,
  getMidSizedCareersConfigs,
} from '@/lib/crawler/mid-sized-careers-urls';
import { getUniqueMidSizedRegistryForCrawl } from '@/lib/mid-sized-companies/registry-for-crawl';
import type { CompanySize } from '@/lib/job-board/constants';

export type CrawlerAdapterId =
  | 'kakao'
  | 'naver'
  | 'lg'
  | 'greenhouse'
  | 'generic'
  | 'mid-sized-registry-batch'
  | 'work24-mid-sized-batch';

export type CrawlerTier = 'enterprise' | 'mid-sized' | 'extra';

export type CrawlerCompany = {
  id: string;
  name: string;
  careersUrl: string;
  sourceId: string;
  sourceName: string;
  tier: CrawlerTier;
  /** 공정거래위원회 공시대상 기업집단명 (해당 시) */
  ftcGroupName?: string;
  adapter: CrawlerAdapterId;
  /** Greenhouse 채용 페이지 보드 슬러그(공개 URL 일부, API 키 아님) */
  greenhouseBoard?: string;
  /** 한국 근무지 공고만 수집 */
  koreaOnly?: boolean;
  /** 지정 시 해당 소스 공고의 기업 규모 */
  companySize?: CompanySize;
};

const EXTRA_CRAWLER_COMPANIES: CrawlerCompany[] = [
  {
    id: 'daangn',
    name: '당근마켓',
    careersUrl: 'https://team.daangn.com',
    sourceId: 'daangn-careers',
    sourceName: '당근마켓 채용',
    tier: 'extra',
    adapter: 'greenhouse',
    greenhouseBoard: 'daangn',
    koreaOnly: true,
  },
  {
    id: 'sendbird',
    name: '센드버드',
    careersUrl: 'https://sendbird.com/careers',
    sourceId: 'sendbird-careers',
    sourceName: '센드버드 채용',
    tier: 'extra',
    adapter: 'greenhouse',
    greenhouseBoard: 'sendbird',
    koreaOnly: true,
  },
];

function normalizeCareersUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

function buildFtcCrawlerCompanies(): CrawlerCompany[] {
  return ENTERPRISE_CAREERS_CONFIGS.map((config) => ({
    id: config.crawlSourceId,
    name: config.ftcName,
    careersUrl: config.careersUrl,
    sourceId: `${config.crawlSourceId}-careers`,
    sourceName: `${config.ftcName} 채용`,
    tier: 'enterprise',
    ftcGroupName: config.ftcName,
    adapter: config.adapter ?? 'generic',
    greenhouseBoard: config.greenhouseBoard,
    koreaOnly: config.koreaOnly,
  }));
}

function buildMidSizedCrawlerCompanies(existing: CrawlerCompany[]): CrawlerCompany[] {
  const usedSourceIds = new Set(existing.map((item) => item.sourceId));
  const batchSourceId = 'mid-sized-registry-batch-careers';
  if (usedSourceIds.has(batchSourceId)) return [];

  const registry = getUniqueMidSizedRegistryForCrawl();
  const linked = countMidSizedCareersConfigs();
  const sampleUrl = getMidSizedCareersConfigs()[0]?.careersUrl ?? 'https://www.work24.go.kr/';

  return [
    {
      id: 'mid-sized-registry-batch',
      name: `중견기업 채용 URL DB (${registry.length.toLocaleString('ko-KR')}곳 명단)`,
      careersUrl: sampleUrl,
      sourceId: batchSourceId,
      sourceName: `중견기업 채용 수집 (DB URL ${linked.toLocaleString('ko-KR')}곳)`,
      tier: 'mid-sized',
      adapter: 'mid-sized-registry-batch',
      companySize: '중견기업',
    },
    {
      id: 'work24-mid-sized-batch',
      name: `중견기업 고용24 (${registry.length.toLocaleString('ko-KR')}곳)`,
      careersUrl: 'https://www.work24.go.kr/',
      sourceId: 'work24-mid-sized-batch-careers',
      sourceName: `중견기업 고용24 (명단 ${registry.length.toLocaleString('ko-KR')}곳)`,
      tier: 'mid-sized',
      adapter: 'work24-mid-sized-batch',
      companySize: '중견기업',
    },
  ];
}

function buildAllCrawlerCompanies(): CrawlerCompany[] {
  const enterpriseCompanies = buildFtcCrawlerCompanies();
  const midSizedCompanies = buildMidSizedCrawlerCompanies(enterpriseCompanies);
  return [...enterpriseCompanies, ...midSizedCompanies, ...EXTRA_CRAWLER_COMPANIES];
}

/**
 * 등록된 채용 사이트는 매 수집마다 순서 없이 전부 크롤링합니다.
 * 중견기업 targets JSON은 실행 시마다 다시 읽습니다.
 */
export function getCrawlerCompanies(): CrawlerCompany[] {
  return buildAllCrawlerCompanies();
}

/** @deprecated getCrawlerCompanies()를 사용하세요. */
export const CRAWLER_COMPANIES: CrawlerCompany[] = buildAllCrawlerCompanies();

export function countCrawlerCompaniesByTier(): Record<CrawlerTier, number> {
  return getCrawlerCompanies().reduce(
    (acc, company) => {
      acc[company.tier] += 1;
      return acc;
    },
    { enterprise: 0, 'mid-sized': 0, extra: 0 } as Record<CrawlerTier, number>,
  );
}

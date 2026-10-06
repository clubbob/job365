import { ENTERPRISE_CAREERS_CONFIGS } from '@/lib/crawler/enterprise-careers-urls';

export type CrawlerAdapterId =
  | 'kakao'
  | 'naver'
  | 'lg'
  | 'greenhouse'
  | 'generic';

export type CrawlerCompany = {
  id: string;
  name: string;
  careersUrl: string;
  sourceId: string;
  sourceName: string;
  /** 공정거래위원회 공시대상 기업집단명 (해당 시) */
  ftcGroupName?: string;
  adapter: CrawlerAdapterId;
  /** Greenhouse 채용 페이지 보드 슬러그(공개 URL 일부, API 키 아님) */
  greenhouseBoard?: string;
  /** 한국 근무지 공고만 수집 */
  koreaOnly?: boolean;
};

const EXTRA_CRAWLER_COMPANIES: CrawlerCompany[] = [
  {
    id: 'daangn',
    name: '당근마켓',
    careersUrl: 'https://team.daangn.com',
    sourceId: 'daangn-careers',
    sourceName: '당근마켓 채용',
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
    adapter: 'greenhouse',
    greenhouseBoard: 'sendbird',
    koreaOnly: true,
  },
];

function buildFtcCrawlerCompanies(): CrawlerCompany[] {
  return ENTERPRISE_CAREERS_CONFIGS.map((config) => ({
    id: config.crawlSourceId,
    name: config.ftcName,
    careersUrl: config.careersUrl,
    sourceId: `${config.crawlSourceId}-careers`,
    sourceName: `${config.ftcName} 채용`,
    ftcGroupName: config.ftcName,
    adapter: config.adapter ?? 'generic',
    greenhouseBoard: config.greenhouseBoard,
    koreaOnly: config.koreaOnly,
  }));
}

/**
 * 등록된 채용 사이트는 매 수집마다 순서 없이 전부 크롤링합니다.
 * 회사별 API 키는 쓰지 않고, 채용 페이지·공개 목록 URL을 직접 조회합니다.
 * 실패하면 이번 회차만 건너뛰고, 다음 cron에서 다시 시도합니다.
 */
export const CRAWLER_COMPANIES: CrawlerCompany[] = [...buildFtcCrawlerCompanies(), ...EXTRA_CRAWLER_COMPANIES];

export function getCrawlerCompanies(): CrawlerCompany[] {
  return CRAWLER_COMPANIES;
}

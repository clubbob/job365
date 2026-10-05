export type CrawlerAdapterId =
  | 'kakao'
  | 'naver'
  | 'lg'
  | 'greenhouse'
  | 'samsung'
  | 'hyundai'
  | 'hanwha'
  | 'sk'
  | 'posco';

export type CrawlerCompany = {
  id: string;
  name: string;
  careersUrl: string;
  sourceId: string;
  sourceName: string;
  adapter: CrawlerAdapterId;
  /** Greenhouse boards-api 토큰 */
  greenhouseBoard?: string;
  /** 한국 근무지 공고만 수집 */
  koreaOnly?: boolean;
};

/**
 * 등록된 채용 사이트는 매 수집마다 순서 없이 전부 시도합니다.
 * 실패하면 이번 회차만 건너뛰고, 다음 cron에서 다시 시도합니다.
 */
export const CRAWLER_COMPANIES: CrawlerCompany[] = [
  {
    id: 'kakao',
    name: '카카오',
    careersUrl: 'https://careers.kakao.com',
    sourceId: 'kakao-careers',
    sourceName: '카카오 채용',
    adapter: 'kakao',
  },
  {
    id: 'naver',
    name: '네이버',
    careersUrl: 'https://recruit.navercorp.com',
    sourceId: 'naver-careers',
    sourceName: '네이버 채용',
    adapter: 'naver',
  },
  {
    id: 'lg',
    name: 'LG',
    careersUrl: 'https://careers.lg.com',
    sourceId: 'lg-careers',
    sourceName: 'LG 채용',
    adapter: 'lg',
  },
  {
    id: 'samsung',
    name: '삼성',
    careersUrl: 'https://www.samsungcareers.com',
    sourceId: 'samsung-careers',
    sourceName: '삼성 채용',
    adapter: 'samsung',
  },
  {
    id: 'hyundai',
    name: '현대자동차',
    careersUrl: 'https://talent.hyundai.com',
    sourceId: 'hyundai-careers',
    sourceName: '현대자동차 채용',
    adapter: 'hyundai',
  },
  {
    id: 'hanwha',
    name: '한화',
    careersUrl: 'https://www.hanwhain.com',
    sourceId: 'hanwha-careers',
    sourceName: '한화 채용',
    adapter: 'hanwha',
  },
  {
    id: 'sk',
    name: 'SK',
    careersUrl: 'https://www.skcareers.com',
    sourceId: 'sk-careers',
    sourceName: 'SK 채용',
    adapter: 'sk',
  },
  {
    id: 'posco',
    name: 'POSCO',
    careersUrl: 'https://recruit.posco.com',
    sourceId: 'posco-careers',
    sourceName: 'POSCO 채용',
    adapter: 'posco',
  },
  {
    id: 'coupang',
    name: '쿠팡',
    careersUrl: 'https://www.coupang.jobs/kr/jobs',
    sourceId: 'coupang-careers',
    sourceName: '쿠팡 채용',
    adapter: 'greenhouse',
    greenhouseBoard: 'coupang',
    koreaOnly: true,
  },
  {
    id: 'krafton',
    name: '크래프톤',
    careersUrl: 'https://www.krafton.com/careers',
    sourceId: 'krafton-careers',
    sourceName: '크래프톤 채용',
    adapter: 'greenhouse',
    greenhouseBoard: 'krafton',
    koreaOnly: true,
  },
  {
    id: 'daangn',
    name: '당근마켓',
    careersUrl: 'https://about.daangn.com/careers/',
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

export function getCrawlerCompanies(): CrawlerCompany[] {
  return CRAWLER_COMPANIES;
}

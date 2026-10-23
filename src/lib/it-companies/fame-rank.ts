import { normalizeItCompanyLabel } from '@/lib/it-companies/catalog';
import { enterpriseFameRankByCrawlSourceId } from '@/lib/enterprise-groups/fame-order';
import { masterSeedFameRank } from '@/lib/it-companies/master-seed';

const FAME_UNKNOWN_BASE = 20_000;

/** crawlSourceId 기준(대기업·별도 등록 수집 대상) */
const CRAWL_SOURCE_FAME_RANK: Record<string, number> = {
  kakao: 0,
  naver: 1,
  coupang: 2,
  toss: 3,
  line: 4,
  krafton: 5,
  nexon: 6,
  netmarble: 7,
  dunamu: 8,
  lg: 9,
};

/**
 * 앞쪽이 더 유명. 긴·구체적인 이름을 먼저 두어 부분 일치 순서를 맞춥니다.
 */
const IT_COMPANY_FAME_NAME_TOKENS = [
  '삼성에스디에스',
  '삼성sds',
  '에스케이씨앤씨',
  'sk씨앤씨',
  'skcc',
  '엘지씨엔에스',
  'lgcns',
  '엘지cns',
  '현대오토에버',
  '포스코dx',
  '롯데정보통신',
  '신세계아이앤씨',
  '신세계i&c',
  'cj올리브네트웍스',
  'gsitm',
  '카카오뱅크',
  '카카오페이',
  '카카오',
  '네이버',
  '쿠팡',
  '비바리퍼블리카',
  '토스',
  '라인',
  'nhn',
  '크래프톤',
  '넥슨',
  '넷마블',
  'nc소프트',
  '엔씨소프트',
  '스마일게이트',
  '펄어비스',
  '컴투스',
  '데브시스터즈',
  '위메이드',
  '두나무',
  '당근마켓',
  '안랩',
  '한컴',
  '더존',
  '티맥스',
  '파수',
  '영림원',
  '이글루',
  '코난테크',
  '솔트룩스',
  '업스테이지',
  '뱅크샐러드',
  '채널톡',
  '센드버드',
  '센드그리드',
  '리디',
  '마인즈ai',
  '딥노이드',
];

function nameMatchesFameToken(norm: string, token: string): boolean {
  if (!token) return false;
  if (norm === token) return true;
  if (norm.startsWith(token)) return true;
  if (token.length < 4) return false;
  return norm.includes(token);
}

function fameRankFromCompanyName(companyName: string): number {
  const norm = normalizeItCompanyLabel(companyName);
  const ranked = IT_COMPANY_FAME_NAME_TOKENS.map((label, index) => ({
    index,
    token: normalizeItCompanyLabel(label),
  }))
    .filter((item) => item.token.length > 0)
    .sort((a, b) => b.token.length - a.token.length);

  for (const { token, index } of ranked) {
    if (nameMatchesFameToken(norm, token)) {
      return 100 + index;
    }
  }
  return FAME_UNKNOWN_BASE;
}

function crawlSourceFameRank(crawlSourceId: string): number | null {
  const id = crawlSourceId.trim();
  if (!id || id.startsWith('mid-')) return null;
  if (id in CRAWL_SOURCE_FAME_RANK) {
    return CRAWL_SOURCE_FAME_RANK[id];
  }
  const base = id.replace(/-careers$/, '');
  if (base in CRAWL_SOURCE_FAME_RANK) {
    return CRAWL_SOURCE_FAME_RANK[base];
  }
  return null;
}

export function itCompanyFameRank(
  companyName: string,
  crawlSourceId: string | null | undefined,
  activeJobCount = 0,
): number {
  const id = crawlSourceId?.trim();
  if (id) {
    const enterprise = enterpriseFameRankByCrawlSourceId(id);
    if (enterprise < 10_000) return enterprise;
    const fromCrawl = crawlSourceFameRank(id);
    if (fromCrawl !== null) return 50 + fromCrawl;
  }

  const fromSeed = masterSeedFameRank(companyName);
  if (fromSeed !== null) return fromSeed;

  const fromName = fameRankFromCompanyName(companyName);
  if (fromName < FAME_UNKNOWN_BASE) {
    return fromName;
  }

  const jobs = Math.max(0, Math.min(activeJobCount, 9_999));
  return FAME_UNKNOWN_BASE + (9_999 - jobs);
}

export function compareItCompaniesByFame<
  T extends { companyName: string; crawlSourceId: string | null; activeJobCount: number },
>(a: T, b: T): number {
  const rankA = itCompanyFameRank(a.companyName, a.crawlSourceId, a.activeJobCount);
  const rankB = itCompanyFameRank(b.companyName, b.crawlSourceId, b.activeJobCount);
  if (rankA !== rankB) return rankA - rankB;
  return a.companyName.localeCompare(b.companyName, 'ko');
}

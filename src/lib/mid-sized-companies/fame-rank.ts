import { normalizeItCompanyLabel } from '@/lib/it-companies/catalog';
import { itCompanyFameRank } from '@/lib/it-companies/fame-rank';

const FAME_UNKNOWN_BASE = 20_000;

/** IT 유명도 목록 외 중견·유명 브랜드(긴 이름 우선 매칭) */
const MID_SIZED_EXTRA_FAME_NAME_TOKENS = [
  '프라이스워터하우스쿠퍼스',
  'price waterhouse',
  'pwc',
  '삼일회계법인',
  '삼정회계법인',
  '안진회계법인',
  '한영회계법인',
  '딜로이트안진',
  '딜로이트',
  '한국맥켄지',
  '맥킨지',
  '보스턴컨설팅',
  'bcg',
  '베인앤컴퍼니',
  '우아한형제들',
  '배달의민족',
  '무신사',
  '컬리',
  '마켓컬리',
  '야놀자',
  '직방',
  '스파크플러스',
  '오늘의집',
  '버킷플레이스',
  '토스뱅크',
  '토스페이먼츠',
  '카카오모빌리티',
  '티빙',
  '웨이브',
  '왓챠',
  '쏘카',
  '여기어때',
  '야놀자플랫폼',
  '하이브',
  'jyp',
  'sm엔터테인먼트',
  'yg엔터테인먼트',
  'CJ ENM',
  '스튜디오드래곤',
  '신세계푸드',
  '오뚜기',
  '농심',
  '동원f&b',
  '하이트진로',
  '롯데칠성',
  '풀무원',
  '대상',
  '사조대림',
  '한화솔루션',
  '효성',
  '코오롱',
  '금호석유',
  '한솔',
  'LS전선',
  '효성첨단소재',
];

function nameMatchesFameToken(norm: string, token: string): boolean {
  if (!token) return false;
  if (norm === token) return true;
  if (norm.startsWith(token)) return true;
  if (token.length < 4) return false;
  return norm.includes(token);
}

function fameRankFromExtraTokens(companyName: string): number {
  const norm = normalizeItCompanyLabel(companyName);
  const ranked = MID_SIZED_EXTRA_FAME_NAME_TOKENS.map((label, index) => ({
    index,
    token: normalizeItCompanyLabel(label),
  }))
    .filter((item) => item.token.length > 0)
    .sort((a, b) => b.token.length - a.token.length);

  for (const { token, index } of ranked) {
    if (nameMatchesFameToken(norm, token)) {
      return 200 + index;
    }
  }
  return FAME_UNKNOWN_BASE;
}

export function midSizedCompanyFameRank(
  companyName: string,
  crawlSourceId: string | null | undefined,
  activeJobCount = 0,
): number {
  const fromIt = itCompanyFameRank(companyName, crawlSourceId, activeJobCount);
  const fromExtra = fameRankFromExtraTokens(companyName);
  if (fromExtra < FAME_UNKNOWN_BASE) {
    return Math.min(fromIt, fromExtra);
  }
  return fromIt;
}

export function compareMidSizedCompaniesByFame<
  T extends { companyName: string; crawlSourceId: string; activeJobCount: number },
>(a: T, b: T): number {
  const rankA = midSizedCompanyFameRank(a.companyName, a.crawlSourceId, a.activeJobCount);
  const rankB = midSizedCompanyFameRank(b.companyName, b.crawlSourceId, b.activeJobCount);
  if (rankA !== rankB) return rankA - rankB;
  return a.companyName.localeCompare(b.companyName, 'ko');
}

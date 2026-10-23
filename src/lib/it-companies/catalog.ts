/**
 * 관리자 「IT 기업」 탭: 전산·소프트웨어·프로그래밍·정보서비스(SI/MSP 등) 중심.
 * 일반 제조·바이오·건설 등의 「기술」 업체는 이름 키워드만으로 넣지 않습니다.
 */

import { isMasterSeedItCompany } from '@/lib/it-companies/master-seed';

export function normalizeItCompanyLabel(name: string): string {
  return name
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .trim()
    .toLowerCase();
}

/** 소프트웨어·게임·핀테크·SI 등 전산/개발 채용이 핵심인 브랜드(부분 일치) */
const IT_COMPUTING_BRAND_SUBSTRINGS = [
  '카카오',
  '네이버',
  '라인',
  '쿠팡',
  '토스',
  '비바리퍼블리카',
  '두나무',
  '크래프톤',
  '넥슨',
  '넷마블',
  '엔씨',
  'nc소프트',
  '스마일게이트',
  '펄어비스',
  '컴투스',
  '데브시스터즈',
  '위메이드',
  'nhn',
  '한컴',
  '안랩',
  '센드버드',
  '센드그리드',
  '채널톡',
  '뱅크샐러드',
  '리디',
  '업스테이지',
  '솔트룩스',
  '마인즈ai',
  '딥노이드',
  '파수',
  '티맥스',
  '더존',
  '영림원',
  '이글루',
  '코난테크',
  '엘지cns',
  'lgcns',
  '삼성sds',
  'skcc',
  'sk씨앤씨',
  '포스코dx',
  '현대오토에버',
  '롯데정보통신',
  '신세계i&c',
  'cj올리브네트웍스',
  'gsitm',
  '이랜드이노',
  '카카오뱅크',
  '카카오페이',
  '당근마켓',
];

/** 회사명에 전산·SW·프로그래밍·SI 등이 드러나는 경우만 */
const IT_COMPUTING_NAME_PATTERN =
  /(?:소프트웨어|시스템\s*소프트|SW|컴퓨터|전산|정보처리|정보시스템|프로그래밍|프로그램\s*개발|정보통신|정보보호|사이버\s*보안|클라우드|시스템\s*통합|시스템\s*엔지니어링|IT\s*서비스|IT\s*컨설팅|디지털\s*트윈|게임\s*(?:개발|소프트)|인터넷\s*서비스|데이터\s*센터|호스팅\s*서비스)/iu;

/** 업종 문자열(중견 마당 등) — KSIC 계열 표현 */
const IT_COMPUTING_INDUSTRY_PATTERN =
  /(?:소프트웨어|시스템\s*소프트|컴퓨터\s*프로그래밍|프로그래밍|전산|정보처리|호스팅|포털|인터넷\s*정보|데이터\s*처리|정보통신|정보보호|사이버|클라우드|게임\s*소프트|게임\s*개발|IT\s*서비스)/iu;

/** 대기업 채용 URL에 연결된 crawlSourceId (전산·SW 중심 집단) */
export const IT_ENTERPRISE_CRAWL_SOURCE_IDS = new Set([
  'kakao',
  'naver',
  'lg',
  'coupang',
  'krafton',
  'nexon',
  'netmarble',
  'dunamu',
  'line',
  'toss',
]);

export function isItComputingIndustry(industry: string | null | undefined): boolean {
  const trimmed = (industry ?? '').trim();
  if (!trimmed) return false;
  return IT_COMPUTING_INDUSTRY_PATTERN.test(trimmed);
}

export function isItComputingCompanyName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (isMasterSeedItCompany(trimmed)) return true;
  const norm = normalizeItCompanyLabel(trimmed);
  if (IT_COMPUTING_BRAND_SUBSTRINGS.some((token) => norm.includes(normalizeItCompanyLabel(token)))) {
    return true;
  }
  return IT_COMPUTING_NAME_PATTERN.test(trimmed);
}

/** @deprecated use isItComputingCompanyName */
export function isItCompanyLabel(name: string): boolean {
  return isItComputingCompanyName(name);
}

export function isItComputingCompany(
  companyName: string,
  industry?: string | null,
): boolean {
  if (isItComputingIndustry(industry)) return true;
  return isItComputingCompanyName(companyName);
}

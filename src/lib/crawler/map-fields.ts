import type { CompanySize, EmploymentType, JobRegion, JobRole } from '@/lib/job-board/constants';
import { EMPLOYMENT_TYPES } from '@/lib/job-board/constants';

const LOCATION_MAP: Record<string, JobRegion> = {
  판교: '경기',
  분당: '경기',
  경기도: '경기',
  경기: '경기',
  성남: '경기',
  수원: '경기',
  서울: '서울',
  강남: '서울',
  여의도: '서울',
  부산: '부산',
  대구: '대구',
  광주: '광주',
  대전: '대전',
  울산: '울산',
  세종: '세종',
  인천: '인천',
  제주: '제주',
  재택: '재택',
  REMOTE: '재택',
};

const ROLE_IT_AI_PROGRAMMING: JobRole = 'IT·AI·프로그래밍';

const PART_ROLE_MAP: Record<string, JobRole> = {
  TECHNOLOGY: ROLE_IT_AI_PROGRAMMING,
  DESIGN: '디자인',
  BUSINESS_SERVICES: '서비스·고객 관리',
  STAFF: '경영·사무',
};

/** 생산·제조·현장·호텔 등 — 소프트웨어 IT 직무로 분류하지 않습니다. */
const NON_SOFTWARE_IT_CONTEXT =
  /생산|제조|공정|설비|기계|화학공정|자동화\s*설비|Plant|Technician|Manufacturing|품질관리|의료기기|호텔|Hospitality|프론트\s*(?:오피스|데스크)|Field\s*Service|현장|교대\s*근무/i;

function haystackContainsNaverClassLabel(haystack: string, label: string): boolean {
  if (label === 'Tech') return /\bTech\b/i.test(haystack);
  return haystack.includes(label);
}

const TITLE_ROLE_KEYWORDS: Array<{ pattern: RegExp; role: JobRole }> = [
  {
    pattern:
      /개발자|Developer|Programmer|백엔드|프론트엔드|Frontend|서버\s*개발|DevOps|SRE|(?:SW|소프트웨어|웹|앱|시스템|네트워크|보안)\s*(?:개발|엔지니어)|(?:IT|ICT)\s*(?:개발|엔지니어)|Software\s*Engineer/i,
    role: ROLE_IT_AI_PROGRAMMING,
  },
  {
    pattern: /(?:데이터|Data)\s*(?:엔지니어|분석|사이언티스트)|\bML\b|\bAI\b(?!\s*(?:교육|강사))|Machine\s*Learning/i,
    role: ROLE_IT_AI_PROGRAMMING,
  },
  { pattern: /(?:SW|소프트웨어)\s*QA|테스트\s*엔지니어|QA\s*엔지니어/i, role: ROLE_IT_AI_PROGRAMMING },
  { pattern: /기획|(?:^|[^A-Za-z])PM(?:[^A-Za-z]|$)|Product\s*Manager|Product\s*Owner/i, role: '기획·PM' },
  { pattern: /디자인|Design|UX|UI/i, role: '디자인' },
  { pattern: /마케팅|Marketing|광고|브랜드|\bMD\b/i, role: '마케팅·광고' },
  { pattern: /영업|Sales|판매|수주|무역|쇼핑몰/i, role: '영업·판매' },
  { pattern: /회계|재무|세무|경리|자금|결산|금융|보험|증권|Finance/i, role: '금융·회계' },
  { pattern: /인사|\bHR\b|총무|경영|사무|행정|비서|법무|구매|자재|외주/i, role: '경영·사무' },
  {
    pattern:
      /생산|제조|생산직|기능직|공정|설비|기계|품질|가공|조립|용접|보전|공무|오퍼레이터|Operator|교대|현장직|패키징|포장|금형|사출|프레스|\bCNC\b|\bNCT\b|비파괴|검사원|물류|피킹|기술직|전기|전장|냉동|공조|유지\s*[,·]?\s*보수|설비OP|기술\s*엔지니어/i,
    role: '생산·제조',
  },
  { pattern: /연구|R&D|설계|연구원|연구소|Test\s*Engineer|\bEngineer\b/i, role: '연구·개발' },
  { pattern: /교육|강사/i, role: '교육' },
  {
    pattern:
      /고객|상담|콜센터|\bCS\b|\bCX\b|\bTM\b|예약|미화|시설관리|방역|방제|위생|호텔|조리|요리|매장|서비스|간호|의료|보건|운전|배송/i,
    role: '서비스·고객 관리',
  },
  { pattern: /홍보|콘텐츠|기자/i, role: '마케팅·광고' },
  { pattern: /건축|건설|토목|안전|환경|\bUtility\b/i, role: '생산·제조' },
];

export function parseEmploymentTypesFromTitle(title: string): EmploymentType[] {
  return parseEmploymentTypesFromText(title);
}

const NAVER_CLASS_ROLE_MAP: Record<string, JobRole> = {
  Tech: ROLE_IT_AI_PROGRAMMING,
  Design: '디자인',
  'Service & Business': '기획·PM',
};

const NAVER_COMPANY_NAMES: Record<string, string> = {
  NAVER: '네이버',
  'NAVER WEBTOON': '네이버웹툰',
  'NAVER Cloud': '네이버클라우드',
  'NAVER LABS': '네이버랩스',
  SNOW: '스노우',
};

export function normalizeNaverCompanyName(name: string): string {
  const trimmed = name.trim();
  return NAVER_COMPANY_NAMES[trimmed] ?? trimmed;
}

export function inferJobRoles(title: string, part?: string, ...extraLabels: string[]): JobRole[] {
  const roles = new Set<JobRole>();
  const haystack = [title, part, ...extraLabels].filter(Boolean).join(' ');
  const blockSoftwareIt = NON_SOFTWARE_IT_CONTEXT.test(haystack);

  if (part && PART_ROLE_MAP[part]) {
    const role = PART_ROLE_MAP[part];
    if (role !== ROLE_IT_AI_PROGRAMMING || !blockSoftwareIt) roles.add(role);
  }

  for (const [label, role] of Object.entries(NAVER_CLASS_ROLE_MAP)) {
    if (!haystackContainsNaverClassLabel(haystack, label)) continue;
    if (role === ROLE_IT_AI_PROGRAMMING && blockSoftwareIt) continue;
    roles.add(role);
  }

  for (const item of TITLE_ROLE_KEYWORDS) {
    if (item.pattern.test(haystack)) roles.add(item.role);
  }

  if (blockSoftwareIt) roles.delete(ROLE_IT_AI_PROGRAMMING);

  if (roles.size === 0) {
    if (/공장|캠퍼스|부품|현장|반도체|기술|단조|철강|화학|전지/i.test(haystack)) {
      roles.add('생산·제조');
    } else {
      roles.add('경영·사무');
    }
  }

  return [...roles];
}

export function parseEmploymentTypesFromText(title: string, ...extraLabels: string[]): EmploymentType[] {
  const haystack = [title, ...extraLabels].join(' ');
  const found = new Set<EmploymentType>();
  if (/신입/.test(haystack)) found.add('신입');
  if (/경력/.test(haystack) || /Experienced/i.test(haystack)) found.add('경력');
  if (/인턴/.test(haystack)) found.add('인턴');
  if (/계약/.test(haystack)) found.add('계약직');
  if (found.size === 0) found.add('경력');
  return EMPLOYMENT_TYPES.filter((type) => found.has(type));
}

export function mapLocationToRegions(locationName?: string | null): JobRegion[] {
  if (!locationName?.trim()) return ['경기'];
  const raw = locationName.trim();

  if (/재택|remote/i.test(raw)) return ['재택'];

  for (const [key, region] of Object.entries(LOCATION_MAP)) {
    if (raw.includes(key)) return [region];
  }

  return ['경기'];
}

export function defaultCompanySize(companyName: string): CompanySize {
  const big = ['카카오', '삼성', 'LG', '현대', '네이버', 'SK', '쿠팡', '라인', '크래프톤', '당근'];
  if (big.some((name) => companyName.includes(name))) return '대기업';
  return '중견기업';
}

export function resolveCompanySize(companyName: string, preferred?: CompanySize): CompanySize {
  return preferred ?? defaultCompanySize(companyName);
}

export function buildDescription(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join('');
}

export function textSection(title: string, body?: string | null): string {
  const trimmed = body?.trim();
  if (!trimmed) return '';
  const html = trimmed.replace(/\n/g, '<br>');
  return `<section><h3>${title}</h3><p>${html}</p></section>`;
}

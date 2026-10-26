import { decodeHtmlEntities } from '@/lib/crawler/decode-html-text';
import { stripJobTitleCountdownNoise } from '@/lib/crawler/normalize-job-title';

export function normalizeCompanyLabel(name: string): string {
  return decodeHtmlEntities(name)
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .trim()
    .toLowerCase();
}

/** 제목 앞 (주) 표기를 반각 괄호·일반 공백으로 맞춥니다. */
export function normalizeCorpTitlePrefix(title: string): string {
  return decodeHtmlEntities(title)
    .replace(/\u00a0/g, ' ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 제목·블록에 적힌 (주)회사명 */
export function extractCompanyHintFromTitle(title: string): string | null {
  const decoded = normalizeCorpTitlePrefix(title);
  const match = decoded.match(/\(\s*주\s*\)\s*([가-힣A-Za-z0-9&.·\s]+?)(?=\s*\[|\s+[^\s]|\s*$)/);
  const core = match?.[1]?.replace(/\s+/g, '').trim();
  return core && core.length >= 2 ? core : null;
}

/** 제목 앞에 회사명이 이미 포함돼 있는지(모집 회사 중복 표시 방지) */
export function companyLabelContainedInTitle(title: string, companyName: string): boolean {
  const titleNorm = normalizeCompanyLabel(title);
  const companyNorm = normalizeCompanyLabel(companyName);
  if (!titleNorm || !companyNorm || companyNorm.length < 2) return false;
  return titleNorm.startsWith(companyNorm) || titleNorm.includes(companyNorm);
}

export function companyLabelsMatch(a: string, b: string): boolean {
  const left = normalizeCompanyLabel(a);
  const right = normalizeCompanyLabel(b);
  if (!left || !right) return true;
  if (left === right) return true;
  if (left.length >= 3 && right.includes(left)) return true;
  if (right.length >= 3 && left.includes(right)) return true;
  return false;
}

const JOB_TITLE_NOISE_WORDS =
  /^(?:신입|경력|경력무관|학력무관|성별무관|나이유관|공채|모집|채용|하반기|상반기|품질보증|개발|운영|사원|직원|정규직|계약직|인턴|인턴십|파견직|기간제|생산직|사무직|기술직|연구직|영업직|관리직|운전직|화학소재|연구개발|생산관리|품질관리|영업관리|경영지원|고객지원|기술영업|해외영업|국내영업)$/u;

/** 제목에서 떼어 낸 조각이 회사명으로 믿을 만한지(채용 조건·직무명 제외) */
const TITLE_COMPANY_HINT =
  /(?:주식회사|\(\s*주\s*\)|㈜|그룹|홀딩스|코리아|건설|공업|산업|제약|전자|전기|중공업|물산|카드|페이|테크놀로지|테크|시스템즈|시스템|솔루션즈|솔루션|캐피탈|은행|증권|보험|병원|대학교|엔지니어링|파트너스|네트웍스|네트워크|로지스틱스|바이오|푸드)$/u;

export function titleFragmentLooksLikeCompanyName(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (JOB_TITLE_NOISE_WORDS.test(trimmed)) return false;
  if (/무관$/u.test(trimmed)) return false;
  if (/\(\s*주\s*\)|주식회사|㈜/u.test(trimmed)) return true;
  if (TITLE_COMPANY_HINT.test(trimmed.replace(/\s+/g, ''))) return true;
  return false;
}

/** 제목 앞부분이 직무·직급으로 잘못 잘리는 영문 단어 */
const ENGLISH_RECRUITING_EMPLOYER_NOISE = new Set([
  'software',
  'senior',
  'junior',
  'engineer',
  'engineering',
  'developer',
  'development',
  'manager',
  'management',
  'intern',
  'internship',
  'staff',
  'lead',
  'principal',
  'associate',
  'director',
  'analyst',
  'consultant',
  'specialist',
  'coordinator',
  'assistant',
  'head',
  'global',
  'digital',
  'cloud',
  'data',
  'product',
  'project',
  'business',
  'technical',
  'technology',
  'hiring',
  'campus',
  'graduate',
  'experienced',
  'professional',
  'recruit',
  'recruitment',
  'position',
  'team',
  'division',
  'dept',
  'department',
  'center',
  'centre',
  'group',
  'unit',
  'part',
  'planning',
  'operation',
  'operations',
  'research',
  'design',
  'marketing',
  'sales',
  'finance',
  'hr',
  'it',
  'ai',
  'ml',
  'dev',
  'qa',
  'pm',
  'po',
  'backend',
  'frontend',
  'fullstack',
  'full-stack',
  'mobile',
  'web',
  'server',
  'infra',
  'platform',
  'service',
  'services',
  'solution',
  'solutions',
  'system',
  'systems',
  'security',
  'network',
  'quality',
  'production',
  'manufacturing',
  'supply',
  'chain',
  'logistics',
  'customer',
  'support',
  'admin',
  'office',
  'general',
  'corporate',
  'new',
  'open',
  'role',
  'job',
  'jobs',
  'career',
  'careers',
]);

/** 포털 목록 줄 앞·뒤에 붙는 마감·형태 문구 */
export function stripCrawledListTitleNoise(title: string): string {
  return stripJobTitleCountdownNoise(
    normalizeCorpTitlePrefix(title).replace(
      /\s+D-\d+\s+(?:신입|경력)(?:\s*·\s*경력)?\s*$/u,
      '',
    ),
  ).trim();
}

function isJobTitleNoiseWord(word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed || trimmed.length < 2) return true;
  if (JOB_TITLE_NOISE_WORDS.test(trimmed)) return true;
  if (/^\d{4}$/u.test(trimmed)) return true;
  return false;
}

/**
 * 수집 제목에 적힌 모집 회사(명단 회사와 다를 수 있음).
 * (주)·주식회사·「| 중견기업」·꼬리 회사명을 순서대로 찾습니다.
 */
export function extractEmployerLabelFromCrawledTitle(title: string): string | null {
  const decoded = stripCrawledListTitleNoise(title);
  if (!decoded) return null;

  const midsized = decoded.match(/([가-힣A-Za-z0-9·&.\-]{2,36})\s*\|\s*중견기업\s*$/u);
  if (midsized?.[1] && !isJobTitleNoiseWord(midsized[1])) {
    return midsized[1].trim();
  }

  const jushik = decoded.match(/주식회사\s+([가-힣A-Za-z0-9·&.\-]{2,36})/u);
  if (jushik?.[1]) {
    return `주식회사 ${jushik[1].trim()}`;
  }

  const corpParen = decoded.match(/\(\s*주\s*\)\s*([가-힣A-Za-z0-9·&.\-\s]{2,36})/u);
  if (corpParen?.[1] && !isJobTitleNoiseWord(corpParen[1])) {
    return `(주) ${corpParen[1].replace(/\s+/g, ' ').trim()}`;
  }

  const end = decoded.match(/(?:\)\)|\)|\]|\s)([가-힣][가-힣A-Za-z0-9·&.\-]{3,36})\s*$/u);
  if (end?.[1] && titleFragmentLooksLikeCompanyName(end[1])) {
    return end[1].trim();
  }

  return null;
}

/** 제목에서 모집 회사 표기를 빼고 남은 모집 제목 */
export function stripEmployerFromCrawledTitle(title: string, employer: string): string {
  let rest = stripCrawledListTitleNoise(title);
  const emp = employer.trim();
  if (!emp || !rest) return rest;

  const variants = [
    emp,
    emp.replace(/^\(\s*주\s*\)\s*/u, ''),
    emp.replace(/^주식회사\s*/u, ''),
    `| ${emp}`,
    `${emp} | 중견기업`,
  ].filter((item, index, list) => item.length >= 2 && list.indexOf(item) === index);

  for (const needle of variants) {
    if (rest.endsWith(needle)) {
      rest = rest.slice(0, -needle.length).trim();
    }
    if (rest.includes(needle)) {
      rest = rest.replace(needle, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  return rest.replace(/\s*\|\s*중견기업\s*$/u, '').trim();
}

/** 모집 회사명으로 쓸 수 있는지(직무·직급 단어 제외) */
export function isPlausibleRecruitingEmployerLabel(employer: string): boolean {
  const trimmed = employer.trim();
  if (!trimmed || trimmed.length < 2) return false;

  const compact = trimmed.replace(/\s+/g, ' ');
  const lower = compact.toLowerCase();

  if (JOB_TITLE_NOISE_WORDS.test(compact)) return false;
  if (/무관$/u.test(compact)) return false;

  const tokens = lower.split(/[\s/|,·]+/).filter(Boolean);
  if (tokens.length === 0) return false;

  if (tokens.length === 1) {
    const token = tokens[0]!.replace(/\.$/, '');
    if (ENGLISH_RECRUITING_EMPLOYER_NOISE.has(token)) return false;
  }

  if (!/[가-힣㈜]/.test(compact) && !/\(\s*주\s*\)/u.test(compact) && !/주식회사/u.test(compact)) {
    const noiseHits = tokens.filter((token) => ENGLISH_RECRUITING_EMPLOYER_NOISE.has(token)).length;
    if (noiseHits > 0 && noiseHits >= Math.ceil(tokens.length / 2)) return false;
    if (tokens.length <= 2 && tokens.every((token) => /^[a-z]+$/i.test(token))) {
      return false;
    }
  }

  return true;
}

/** 포털 목록에서 다른 회사 공고가 명단 회사 source에 섞이지 않도록 합니다. */
export function jobMatchesExpectedCompany(
  expectedCompanyName: string,
  title: string,
  candidateCompanyName?: string,
): boolean {
  const expected = expectedCompanyName.trim();
  if (!expected) return true;

  if (candidateCompanyName && !companyLabelsMatch(expected, candidateCompanyName)) {
    return false;
  }

  const hint = extractCompanyHintFromTitle(title);
  if (hint && !companyLabelsMatch(expected, hint)) {
    return false;
  }

  const embedded = extractEmployerLabelFromCrawledTitle(title);
  if (embedded && !companyLabelsMatch(expected, embedded)) {
    return false;
  }

  const titleNorm = normalizeCompanyLabel(title);
  const expectedNorm = normalizeCompanyLabel(expected);
  if (expectedNorm.length >= 4 && titleNorm.length >= 8 && !titleNorm.includes(expectedNorm)) {
    if (hint) return false;
  }

  return true;
}

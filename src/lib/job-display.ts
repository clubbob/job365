import {
  companyLabelContainedInTitle,
  companyLabelsMatch,
  extractCompanyHintFromTitle,
  extractEmployerLabelFromCrawledTitle,
  isPlausibleRecruitingEmployerLabel,
  normalizeCorpTitlePrefix,
  stripCrawledListTitleNoise,
  stripEmployerFromCrawledTitle,
  titleFragmentLooksLikeCompanyName,
} from '@/lib/crawler/company-name-match';
import { extractHeadcountFromJobContent } from '@/lib/crawler/parse-headcount';
import { normalizeJobTitle } from '@/lib/crawler/normalize-job-title';
import { formatKoreaDateWithWeekday } from '@/lib/datetime';
import { jobOccupationsLabel, jobRegionsLabel } from '@/lib/work-preferences';
import {
  CAREER_TYPE_LABELS,
  PAY_TYPE_LABELS,
  isJobCareerType,
  isJobEducation,
  jobPositionLabel,
  jobWorkTypesLabel,
  parseCareerYears,
  type JobPayType,
  type JobPosting,
} from '@/types/job';

export function jobEducationLabel(value?: string): string | undefined {
  if (!value || !isJobEducation(value)) return undefined;
  return value;
}

export function formatJobPayLabel(
  payType: JobPayType,
  amountRaw: string,
  negotiable: boolean,
): string {
  const amount = Number(amountRaw.replace(/[^\d]/g, ''));
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const formatted = amount.toLocaleString('ko-KR');
  const body = hasAmount
    ? payType === 'yearly'
      ? `연봉 ${amount}만원`
      : payType === 'monthly'
        ? `월급 ${amount}만원`
        : payType === 'hourly'
          ? `시급 ${formatted}원`
          : payType === 'daily'
            ? `일급 ${formatted}원`
            : `건당 ${formatted}원`
    : '';

  if (negotiable) {
    const typeLabel = payType === 'per_task' ? '건당' : PAY_TYPE_LABELS[payType];
    return body ? `${body} (협의가능)` : `${typeLabel} 협의`;
  }
  return body;
}

export const PAY_UNIT_LABELS: Record<JobPayType, string> = {
  hourly: '원 / 시간',
  daily: '원 / 일',
  monthly: '만원 / 월',
  yearly: '만원 / 년',
  per_task: '원 / 건',
};

export function parsePayLabel(label: string): {
  payType: JobPayType | '';
  amount: string;
  negotiable: boolean;
} {
  const text = label.trim();
  const negotiable = /협의/.test(text);
  const digits = text.replace(/[^\d]/g, '');
  if (/시급/.test(text)) return { payType: 'hourly', amount: digits, negotiable };
  if (/일급/.test(text)) return { payType: 'daily', amount: digits, negotiable };
  if (/건당|건별/.test(text)) return { payType: 'per_task', amount: digits, negotiable };
  if (/연봉/.test(text)) return { payType: 'yearly', amount: digits, negotiable };
  if (/월급/.test(text)) return { payType: 'monthly', amount: digits, negotiable };
  return { payType: '', amount: '', negotiable };
}

export function formatPayAmountInput(digits: string): string {
  if (!digits) return '';
  const amount = Number(digits.replace(/[^\d]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return amount.toLocaleString('ko-KR');
}

export function jobCareerLabel(job: Pick<JobPosting, 'careerType' | 'careerMinYears'>): string | null {
  if (!job.careerType || !isJobCareerType(job.careerType)) return null;
  if (job.careerType === 'experienced') {
    const years = parseCareerYears(job.careerMinYears);
    return years ? `경력 ${years}년 이상` : CAREER_TYPE_LABELS.experienced;
  }
  return CAREER_TYPE_LABELS[job.careerType];
}

export function jobDeadlineLabel(deadline?: string): string {
  if (!deadline || deadline === 'open') return '상시채용';
  return `${formatKoreaDateWithWeekday(deadline)} 마감`;
}

export function jobHeadcountLabel(headcount?: number): string | null {
  if (!headcount || headcount < 1) return null;
  return `${headcount}명`;
}

export function crawledJobHeadcountLabel(headcount: string | null | undefined): string | undefined {
  const trimmed = headcount?.trim();
  if (!trimmed || /^0+\s*명?$/.test(trimmed)) return undefined;
  return trimmed;
}

/** 저장된 인원이 없으면 공고 요약·상세 HTML에서 추출합니다. */
export function crawledJobHeadcountDisplay(
  headcount: string | null | undefined,
  description?: string | null,
): string | undefined {
  const stored = crawledJobHeadcountLabel(headcount);
  if (stored) return stored;
  if (!description?.trim()) return undefined;
  return crawledJobHeadcountLabel(extractHeadcountFromJobContent(description));
}

export function jobRecentDate(job: Pick<JobPosting, 'createdAt' | 'updatedAt'>): string {
  return job.updatedAt || job.createdAt;
}

export function jobOutlineItems(job: JobPosting): Array<{ label: string; value?: string | null }> {
  return [
    { label: '채용 제목', value: job.title },
    { label: '근무 형태', value: jobWorkTypesLabel(job) },
    { label: '근무 지역', value: jobRegionsLabel(job) },
    { label: '직종', value: jobOccupationsLabel(job) },
    { label: '모집 인원', value: jobHeadcountLabel(job.headcount) },
    { label: '지급 기준', value: job.payLabel },
    { label: '경력 유무', value: jobCareerLabel(job) },
    { label: '학력', value: jobEducationLabel(job.education) },
    { label: '직급/직책', value: jobPositionLabel(job.positionLevel) },
    { label: '수습 기간', value: job.probation },
    { label: '근무 요일', value: job.workDays },
    { label: '근무 시간', value: job.workHours },
    { label: '접수 마감', value: jobDeadlineLabel(job.deadline) },
  ];
}

export function jobDetailItems(job: JobPosting): Array<{ label: string; value?: string | null }> {
  return [
    { label: '담당 업무', value: job.summary },
    { label: '자격 요건', value: job.requirements },
    { label: '우대 사항', value: job.preferred },
    { label: '복리후생', value: job.benefits },
    { label: '전형 절차', value: job.process },
  ];
}

export function jobSearchText(job: JobPosting): string {
  return [
    job.title,
    job.companyName,
    jobOccupationsLabel(job),
    jobRegionsLabel(job),
    job.location,
    job.summary,
    job.payLabel,
    job.workHours,
    job.workDays,
    jobEducationLabel(job.education),
    jobPositionLabel(job.positionLevel),
    job.probation,
    job.requirements,
    job.preferred,
    job.benefits,
    job.process,
    jobCareerLabel(job),
    jobWorkTypesLabel(job),
  ]
    .filter(Boolean)
    .join(' ');
}

/** `[모집 회사] 공고 제목` (포털·계열사 목록) */
const LEADING_BRACKETED_COMPANY_RE = /^(\[[^\]]{2,80}\])\s*(.+)$/u;

/** (주) 회사명 뒤에 `[지점]`이 붙는 포털 제목 */
const LEADING_CORP_WITH_BRACKET_RE =
  /^(\(\s*주\s*\)\s*[가-힣A-Za-z0-9][가-힣A-Za-z0-9·&.\-]*?)(\s*\[.+)$/u;

const LEADING_COMPANY_IN_TITLE_RE =
  /^((?:\(주\)\s*)?[가-힣A-Za-z0-9][가-힣A-Za-z0-9·&.\-]*?(?:주식회사|㈜)?)\s+(.+)$/u;

function splitBracketedCompanyPrefix(full: string): { employer: string; title: string } | null {
  const match = full.match(LEADING_BRACKETED_COMPANY_RE);
  if (!match) return null;
  const employer = match[1].slice(1, -1).trim();
  const position = match[2].trim();
  if (employer.length < 2 || position.length < 2) return null;
  return { employer, title: position };
}

function trySplitLeadingEmployer(full: string): { employer: string; title: string } | null {
  const bracketCompany = splitBracketedCompanyPrefix(full);
  if (bracketCompany) return bracketCompany;

  for (const re of [LEADING_CORP_WITH_BRACKET_RE, LEADING_COMPANY_IN_TITLE_RE]) {
    const match = full.match(re);
    if (!match) continue;
    const employer = match[1].trim();
    const position = match[2].trim();
    if (employer.length >= 2 && position.length >= 2) {
      return { employer, title: position };
    }
  }

  const hint = extractCompanyHintFromTitle(full);
  if (hint) {
    const corpPrefix = full.match(/^(\(\s*주\s*\)\s*[가-힣A-Za-z0-9·&.\-\s]+?)(?=\s*\[|\s+[^\s[]|\s*$)/u)?.[1]?.trim();
    const employer = corpPrefix ?? `(주) ${hint}`;
    const rest = full.slice(employer.length).trim();
    if (rest.length >= 2) {
      return { employer, title: rest };
    }
  }

  return null;
}

function stripLeadingCompanyPrefix(title: string, companyName: string): string | null {
  const cn = companyName.trim();
  if (!cn) return null;
  const prefixes = [
    cn,
    cn.replace(/주식회사/g, '').trim(),
    `(주)${cn.replace(/\(주\)/g, '').trim()}`,
  ];
  for (const prefix of prefixes) {
    if (prefix.length >= 2 && title.startsWith(prefix)) {
      const rest = title.slice(prefix.length).trim();
      if (rest.length >= 4) return rest;
    }
  }
  return null;
}

/**
 * 수집 명단 회사(sourceCompanyName)와 공고 제목을 나눕니다.
 * - employer: 실제 모집 회사(제목 앞부분)
 * - title: 모집 제목
 * - sourceCompany: 수집·연결된 명단 회사(출처)
 */
export function splitCrawledJobHeading(
  sourceCompanyName: string,
  title: string,
): { employer: string; title: string; sourceCompany: string } {
  const full = normalizeCorpTitlePrefix(normalizeJobTitle(title));
  const denoised = stripCrawledListTitleNoise(full);
  const sourceCompany = sourceCompanyName.trim();

  const embeddedEmployer = extractEmployerLabelFromCrawledTitle(denoised);
  const split = trySplitLeadingEmployer(denoised);
  const preferEmbeddedOverSplit =
    Boolean(embeddedEmployer && split) &&
    !companyLabelsMatch(split!.employer, embeddedEmployer!) &&
    (/\|\s*중견기업\s*$/u.test(denoised) || isWeakLeadingEmployer(split!.employer));

  if (split && !isWeakLeadingEmployer(split.employer) && !preferEmbeddedOverSplit) {
    const employer = resolveRecruitingEmployer(split.employer, sourceCompany);
    return { employer, title: split.title, sourceCompany };
  }

  const stripped = stripLeadingCompanyPrefix(denoised, sourceCompany);
  if (stripped) {
    const employer = resolveRecruitingEmployer(sourceCompany, sourceCompany);
    return { employer, title: stripped, sourceCompany };
  }

  if (embeddedEmployer && sourceCompany && !companyLabelsMatch(embeddedEmployer, sourceCompany)) {
    const employer = resolveRecruitingEmployer(embeddedEmployer, sourceCompany);
    if (employer) {
      const roleTitle = stripEmployerFromCrawledTitle(denoised, embeddedEmployer);
      return {
        employer,
        title: roleTitle.length >= 4 ? roleTitle : denoised,
        sourceCompany,
      };
    }
  }

  if (!extractCompanyHintFromTitle(denoised)) {
    const cn = sourceCompany.trim();
    if (cn && !companyLabelContainedInTitle(denoised, cn) && !embeddedEmployer) {
      const employer = resolveRecruitingEmployer(cn, cn);
      return { employer, title: denoised, sourceCompany: cn };
    }
  }

  if (embeddedEmployer && sourceCompany && companyLabelsMatch(embeddedEmployer, sourceCompany)) {
    const roleTitle = stripEmployerFromCrawledTitle(denoised, embeddedEmployer);
    if (roleTitle.length >= 4) {
      const employer = resolveRecruitingEmployer(sourceCompany, sourceCompany);
      return { employer, title: roleTitle, sourceCompany };
    }
  }

  const employer = resolveRecruitingEmployer('', sourceCompany);
  return { employer, title: denoised, sourceCompany };
}

const WEAK_LEADING_EMPLOYER =
  /^(?:남음|\d+일|\d{4}|신입|경력|경력무관|학력무관|공채|모집|채용|하반기|상반기|화학소재)$/u;

function isWeakLeadingEmployer(employer: string): boolean {
  const trimmed = employer.trim();
  if (!trimmed || trimmed.length < 2) return true;
  if (WEAK_LEADING_EMPLOYER.test(trimmed)) return true;
  if (/무관$/u.test(trimmed)) return true;
  if (!isPlausibleRecruitingEmployerLabel(trimmed)) return true;
  if (!titleFragmentLooksLikeCompanyName(trimmed)) return true;
  return false;
}

/** 제목에서 잘못 떼어 낸 직무·조건 대신 수집된 채용 회사명을 씁니다. */
function resolveRecruitingEmployer(candidate: string, sourceCompany: string): string {
  const preferred = candidate.trim();
  const source = sourceCompany.trim();
  if (preferred && isPlausibleRecruitingEmployerLabel(preferred)) {
    if (titleFragmentLooksLikeCompanyName(preferred)) return preferred;
    if (source && companyLabelsMatch(preferred, source)) return preferred;
  }
  if (source && isPlausibleRecruitingEmployerLabel(source)) return source;
  if (source) return source;
  return '';
}

function looksIncompleteRecruitmentTitle(title: string): boolean {
  const text = title.trim();
  if (!text) return true;
  if (/(?:채용|모집|지원)(?:합|함)$/u.test(text)) return true;
  if (/채용$/u.test(text) && !/채용합니다|채용\s*공고/u.test(text)) return true;
  if (/모집$/u.test(text) && !/모집합니다|모집\s*공고/u.test(text)) return true;
  return false;
}

function mendTruncatedRecruitmentTitle(title: string): string {
  let text = title.trim();
  text = text.replace(/(채용|모집|지원)합$/u, '$1합니다');
  text = text.replace(/(채용|모집|지원)함$/u, '$1합니다');
  if (/채용$/u.test(text) && !/채용합니다/u.test(text)) text = `${text}합니다`;
  if (/모집$/u.test(text) && !/모집합니다/u.test(text)) text = `${text}합니다`;
  return text.trim();
}

function recruitmentTitleFromWorkSummary(workSummary: string): string | null {
  const cleaned = workSummary
    .trim()
    .replace(/[,.]?\s*\(\s*주\s*\)\s*$/u, '')
    .trim();
  if (cleaned.length < 8) return null;
  return mendTruncatedRecruitmentTitle(cleaned);
}

/** 상세 히어로 제목 — 모집 회사는 eyebrow에만 두고, 잘린 수집 제목은 복원합니다. */
export function crawledJobDetailTitle(
  rawTitle: string,
  headingTitle: string,
  employer: string,
  workSummary?: string | null,
): string {
  const full = normalizeCorpTitlePrefix(normalizeJobTitle(rawTitle));
  let candidate = headingTitle.trim() || full;

  const withoutEmployer =
    stripLeadingCompanyPrefix(candidate, employer) ??
    stripLeadingCompanyPrefix(full, employer);
  if (withoutEmployer && withoutEmployer.length >= 4) {
    candidate = withoutEmployer;
  }

  if (looksIncompleteRecruitmentTitle(candidate)) {
    candidate = mendTruncatedRecruitmentTitle(candidate);
  }

  if (looksIncompleteRecruitmentTitle(candidate) && workSummary?.trim()) {
    const fromWork = recruitmentTitleFromWorkSummary(workSummary);
    if (fromWork) candidate = fromWork;
  }

  return candidate.trim() || full;
}

/** 목록·검색에서 쓰는 모집 회사명(카드 파란 줄과 동일) */
export function crawledJobRecruitingCompanyName(
  job: Pick<{ companyName: string; title: string }, 'companyName' | 'title'>,
): string {
  const heading = splitCrawledJobHeading(job.companyName, job.title);
  return heading.employer.trim();
}

/** 채용 회사와 다를 때만 「수집 출처」 명단 회사를 보여 줍니다. */
export function shouldShowCrawledCollectSource(employer: string, sourceCompany: string): boolean {
  if (!sourceCompany.trim()) return false;
  if (!employer.trim()) return true;
  return !companyLabelsMatch(employer, sourceCompany);
}

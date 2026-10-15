import type { EmploymentType, JobRegion, JobRole } from '@/lib/job-board/constants';
import { companySegmentsForJob, type JobBoardCompanySegment } from '@/lib/job-board/company-segment';
import { crawledJobRecruitingCompanyName } from '@/lib/job-display';
import type { CrawledJobListItem } from '@/types/crawled-job';
import type { JobAlertPrefs } from '@/types/job-alert-prefs';

export type JobBoardFilters = {
  q?: string;
  employmentTypes?: EmploymentType[];
  companySegments?: JobBoardCompanySegment[];
  roles?: JobRole[];
  regions?: JobRegion[];
  todayOnly?: boolean;
  todayDate?: string;
};

function overlaps<T extends string>(selected: T[], values: T[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => values.includes(item));
}

type CrawledJobKeywordFields = Pick<
  CrawledJobListItem,
  'title' | 'companyName' | 'sourceName' | 'roles' | 'regions'
> & {
  sourceId?: string;
};

/** 채용 공고 검색 — 회사명은 모집 회사(카드 표시) 기준. 관리자는 수집 명단·소스 포함 옵션. */
export function matchesCrawledJobKeyword(
  job: CrawledJobKeywordFields,
  keyword: string,
  options?: {
    includeCollectSource?: boolean;
    /** 맞춤 채용 목록: 직무·지역은 설정으로 이미 걸러짐 */
    titleAndRecruitingCompanyOnly?: boolean;
  },
): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;

  const recruitingCompany = crawledJobRecruitingCompanyName(job);
  const parts = options?.titleAndRecruitingCompanyOnly
    ? [job.title, recruitingCompany]
    : [job.title, recruitingCompany, ...job.roles, ...job.regions];

  if (options?.includeCollectSource) {
    parts.push(job.companyName, job.sourceName, job.sourceId ?? '');
  }

  const haystack = parts.filter(Boolean).join(' ').toLowerCase();

  return haystack.includes(q);
}

function matchesKeyword(job: CrawledJobListItem, keyword: string): boolean {
  return matchesCrawledJobKeyword(job, keyword);
}

export function jobMatchesBoardFilters(job: CrawledJobListItem, filters: JobBoardFilters): boolean {
  if (job.status !== 'active') return false;

  if (filters.todayOnly && filters.todayDate) {
    const crawledDate = job.crawledAt.slice(0, 10);
    if (crawledDate !== filters.todayDate) return false;
  }

  if (!matchesKeyword(job, filters.q ?? '')) return false;

  if (!overlaps(filters.employmentTypes ?? [], job.employmentTypes)) return false;
  if (!overlaps(filters.companySegments ?? [], companySegmentsForJob(job))) return false;
  if (!overlaps(filters.roles ?? [], job.roles)) return false;
  if (!overlaps(filters.regions ?? [], job.regions)) return false;

  return true;
}

export function hasJobAlertFilterPrefs(
  prefs: Pick<JobAlertPrefs, 'employmentTypes' | 'roles' | 'regions'>,
): boolean {
  return (
    prefs.employmentTypes.length > 0 ||
    prefs.roles.length > 0 ||
    prefs.regions.length > 0
  );
}

export function jobMatchesSavedPrefs(
  job: CrawledJobListItem,
  prefs: JobAlertPrefs,
  options?: { requireFilterPrefs?: boolean },
): boolean {
  if (job.status !== 'active') return false;
  if (!hasJobAlertFilterPrefs(prefs)) {
    return options?.requireFilterPrefs ? false : true;
  }

  return jobMatchesBoardFilters(job, {
    employmentTypes: prefs.employmentTypes,
    roles: prefs.roles,
    regions: prefs.regions,
  });
}

export function jobMatchesAlertPrefs(job: CrawledJobListItem, prefs: JobAlertPrefs): boolean {
  if (!prefs.emailEnabled) return false;
  return jobMatchesSavedPrefs(job, prefs);
}

export function isJobNewToday(job: CrawledJobListItem, todayDate: string): boolean {
  return job.crawledAt.slice(0, 10) === todayDate;
}

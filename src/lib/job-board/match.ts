import type { EmploymentType, JobRegion, JobRole } from '@/lib/job-board/constants';
import type { CrawledJobListItem } from '@/types/crawled-job';
import type { JobAlertPrefs } from '@/types/job-alert-prefs';

export type JobBoardFilters = {
  q?: string;
  quickFilter?: 'all' | EmploymentType;
  employmentTypes?: EmploymentType[];
  roles?: JobRole[];
  regions?: JobRegion[];
  todayOnly?: boolean;
  todayDate?: string;
};

function overlaps<T extends string>(selected: T[], values: T[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => values.includes(item));
}

/** 채용 공고 목록·관리자 수집 공고 검색 (공고 제목·회사·직무·지역·소스) */
export function matchesCrawledJobKeyword(
  job: Pick<CrawledJobListItem, 'title' | 'companyName' | 'sourceName' | 'roles' | 'regions'> & {
    sourceId?: string;
  },
  keyword: string,
): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    job.title,
    job.companyName,
    job.sourceName,
    job.sourceId ?? '',
    ...job.roles,
    ...job.regions,
  ]
    .join(' ')
    .toLowerCase();

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

  if (filters.quickFilter && filters.quickFilter !== 'all') {
    if (!job.employmentTypes.includes(filters.quickFilter)) return false;
  }

  if (!overlaps(filters.employmentTypes ?? [], job.employmentTypes)) return false;
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

export function jobMatchesSavedPrefs(job: CrawledJobListItem, prefs: JobAlertPrefs): boolean {
  if (job.status !== 'active') return false;
  if (!hasJobAlertFilterPrefs(prefs)) return true;

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

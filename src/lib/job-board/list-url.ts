import type { JobBoardFilterState } from '@/lib/job-board/filter-state';
import { parseJobBoardCompanySegments } from '@/lib/job-board/company-segment';
import { isEmploymentType, isJobRegion, parseJobRoles } from '@/lib/job-board/constants';
import type { JobBoardListRestoreFilters } from '@/lib/job-board/list-restore';
import { loadJobBoardListRestore } from '@/lib/job-board/list-restore';

export function coerceJobBoardFilterState(filters: JobBoardListRestoreFilters): JobBoardFilterState {
  return {
    q: filters.q,
    employmentTypes: filters.employmentTypes.filter(isEmploymentType),
    companySegments: parseJobBoardCompanySegments(filters.companySegments),
    roles: parseJobRoles(filters.roles),
    regions: filters.regions.filter(isJobRegion),
  };
}

const LIST_RETURN_PARAM_KEYS = [
  'page',
  'q',
  'employmentType',
  'companySegment',
  'role',
  'region',
  'today',
  'pageSize',
] as const;

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseJobBoardListSearchParams(searchParams: URLSearchParams): {
  page: number;
  filters: JobBoardFilterState;
} {
  return {
    page: parsePage(searchParams.get('page')),
    filters: coerceJobBoardFilterState({
      q: searchParams.get('q')?.trim() ?? '',
      employmentTypes: searchParams.getAll('employmentType'),
      companySegments: searchParams.getAll('companySegment'),
      roles: searchParams.getAll('role'),
      regions: searchParams.getAll('region'),
    }),
  };
}

export function hasJobBoardListUrlParams(searchParams: URLSearchParams): boolean {
  return LIST_RETURN_PARAM_KEYS.some((key) => searchParams.has(key));
}

export function copyJobBoardListSearchParams(searchParams: URLSearchParams): URLSearchParams {
  const copied = new URLSearchParams();
  for (const key of LIST_RETURN_PARAM_KEYS) {
    for (const value of searchParams.getAll(key)) {
      copied.append(key, value);
    }
  }
  return copied;
}

export function buildJobBoardListHref(
  basePath: string,
  searchParams: URLSearchParams,
): string {
  const qs = searchParams.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function buildQueryFromRestoreFilters(
  filters: JobBoardListRestoreFilters,
  page: number,
  pageSize: number,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (page > 1) params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  for (const item of filters.employmentTypes) params.append('employmentType', item);
  for (const item of filters.companySegments) params.append('companySegment', item);
  for (const item of filters.roles) params.append('role', item);
  for (const item of filters.regions) params.append('region', item);
  return params;
}

/** 상세 「목록으로」: URL 쿼리 우선, 없으면 sessionStorage 복원 */
export function jobBoardListReturnHref(
  basePath: string,
  persistKey: string,
  searchParams: URLSearchParams,
  pageSize: number,
): string {
  const copied = copyJobBoardListSearchParams(searchParams);
  if (copied.toString()) {
    return buildJobBoardListHref(basePath, copied);
  }
  const restored = loadJobBoardListRestore(persistKey);
  if (restored) {
    return buildJobBoardListHref(
      basePath,
      buildQueryFromRestoreFilters(restored.filters, restored.page, pageSize),
    );
  }
  return basePath;
}

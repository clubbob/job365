import {
  EMPTY_JOB_BOARD_FILTERS,
  type JobBoardFilterState,
} from '@/lib/job-board/filter-state';
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

/** 검색·필터 조건(페이지 번호·pageSize만 있는 경우는 제외) */
export function hasJobBoardListFilterUrlParams(searchParams: URLSearchParams): boolean {
  if (searchParams.get('q')?.trim()) return true;
  if (searchParams.get('today') === '1') return true;
  if (searchParams.has('employmentType')) return true;
  if (searchParams.has('companySegment')) return true;
  if (searchParams.has('role')) return true;
  if (searchParams.has('region')) return true;
  return false;
}

export function hasJobBoardListUrlParams(searchParams: URLSearchParams): boolean {
  if (hasJobBoardListFilterUrlParams(searchParams)) return true;
  const page = parsePage(searchParams.get('page'));
  return page > 1 || searchParams.has('pageSize');
}

/** 목록 URL에서 페이지·필터 복원(필터 없고 1페이지면 null → 전체 목록) */
export function resolveJobBoardListUrlState(searchParams: URLSearchParams): {
  page: number;
  filters: JobBoardFilterState;
} | null {
  if (hasJobBoardListFilterUrlParams(searchParams)) {
    return parseJobBoardListSearchParams(searchParams);
  }
  const page = parsePage(searchParams.get('page'));
  if (page > 1) {
    return { page, filters: EMPTY_JOB_BOARD_FILTERS };
  }
  return null;
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

export type AdminCrawledJobsListBoardFilter = 'all' | 'on_board' | 'off_board';
export type AdminCrawledJobsListStatusFilter = 'all' | 'active' | 'closed';

export type AdminCrawledJobsListUrlState = {
  page: number;
  q: string;
  status: AdminCrawledJobsListStatusFilter;
  board: AdminCrawledJobsListBoardFilter;
};

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseStatus(value: string | null): AdminCrawledJobsListStatusFilter {
  if (value === 'closed' || value === 'all') return value;
  return 'active';
}

function parseBoard(value: string | null): AdminCrawledJobsListBoardFilter {
  if (value === 'on_board' || value === 'off_board') return value;
  return 'all';
}

export function parseAdminCrawledJobsListSearchParams(
  searchParams: URLSearchParams,
  browsableOnly: boolean,
): AdminCrawledJobsListUrlState {
  return {
    page: parsePage(searchParams.get('page')),
    q: searchParams.get('q')?.trim() ?? '',
    status: parseStatus(searchParams.get('status')),
    board: browsableOnly ? 'on_board' : parseBoard(searchParams.get('board')),
  };
}

export function buildAdminCrawledJobsListSearchParams(state: AdminCrawledJobsListUrlState): string {
  const params = new URLSearchParams();
  if (state.page > 1) params.set('page', String(state.page));
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.status !== 'active') params.set('status', state.status);
  if (state.board !== 'all') params.set('board', state.board);
  return params.toString();
}

export function adminCrawledJobsListHref(
  basePath: string,
  state: AdminCrawledJobsListUrlState,
): string {
  const qs = buildAdminCrawledJobsListSearchParams(state);
  return qs ? `${basePath}?${qs}` : basePath;
}

export function adminCrawledJobsListReturnKey(browsableOnly: boolean): string {
  return browsableOnly ? 'admin-jobs-browsable-list-return' : 'admin-jobs-crawled-list-return';
}

export function hasAdminCrawledJobsListUrlParams(
  searchParams: URLSearchParams,
  browsableOnly: boolean,
): boolean {
  if (searchParams.has('page') || searchParams.has('q')) return true;
  if (browsableOnly) return false;
  return searchParams.has('status') || searchParams.has('board');
}

export function persistAdminCrawledJobsListReturnState(
  browsableOnly: boolean,
  state: AdminCrawledJobsListUrlState,
): void {
  try {
    sessionStorage.setItem(
      adminCrawledJobsListReturnKey(browsableOnly),
      buildAdminCrawledJobsListSearchParams(state),
    );
  } catch {
    // sessionStorage unavailable
  }
}

/** 상세 화면 「목록으로」: URL 쿼리 우선, 없으면 마지막 목록 위치(sessionStorage) */
export function adminCrawledJobsListReturnHref(
  basePath: string,
  browsableOnly: boolean,
  searchParams: URLSearchParams,
): string {
  if (hasAdminCrawledJobsListUrlParams(searchParams, browsableOnly)) {
    return adminCrawledJobsListHref(
      basePath,
      parseAdminCrawledJobsListSearchParams(searchParams, browsableOnly),
    );
  }
  try {
    const stored = sessionStorage.getItem(adminCrawledJobsListReturnKey(browsableOnly));
    if (stored) return `${basePath}?${stored}`;
  } catch {
    // sessionStorage unavailable
  }
  return basePath;
}

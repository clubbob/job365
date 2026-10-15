import type { CrawledJobListItem } from '@/types/crawled-job';

export type JobBoardListRestoreFilters = {
  q: string;
  employmentTypes: string[];
  companySegments: string[];
  roles: string[];
  regions: string[];
};

const PREFIX = 'job365.job-board.';
const MAX_STORED_ITEMS = 150;
const RESTORE_MAX_AGE_MS = 30 * 60 * 1000;

export type JobBoardListRestoreState = {
  mode: string;
  filters: JobBoardListRestoreFilters;
  page: number;
  todayPage: number;
  items: CrawledJobListItem[];
  todayItems: CrawledJobListItem[];
  hasMore: boolean;
  todayHasMore: boolean;
  total: number;
  scrollY: number;
  savedAt: number;
};

function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}

function isValidFilters(value: unknown): value is JobBoardListRestoreFilters {
  if (!value || typeof value !== 'object') return false;
  const v = value as JobBoardListRestoreFilters;
  return (
    typeof v.q === 'string' &&
    Array.isArray(v.employmentTypes) &&
    Array.isArray(v.companySegments) &&
    Array.isArray(v.roles) &&
    Array.isArray(v.regions)
  );
}

export function loadJobBoardListRestore(key: string): JobBoardListRestoreState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<JobBoardListRestoreState>;
    if (!isValidFilters(parsed.filters)) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > RESTORE_MAX_AGE_MS) {
      sessionStorage.removeItem(storageKey(key));
      return null;
    }
    return {
      mode: typeof parsed.mode === 'string' ? parsed.mode : 'all',
      filters: parsed.filters,
      page: typeof parsed.page === 'number' && parsed.page > 0 ? parsed.page : 1,
      todayPage: typeof parsed.todayPage === 'number' && parsed.todayPage > 0 ? parsed.todayPage : 1,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      todayItems: Array.isArray(parsed.todayItems) ? parsed.todayItems : [],
      hasMore: Boolean(parsed.hasMore),
      todayHasMore: Boolean(parsed.todayHasMore),
      total: typeof parsed.total === 'number' && parsed.total >= 0 ? parsed.total : 0,
      scrollY: typeof parsed.scrollY === 'number' && parsed.scrollY > 0 ? parsed.scrollY : 0,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveJobBoardListRestore(key: string, state: JobBoardListRestoreState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      storageKey(key),
      JSON.stringify({
        ...state,
        items: state.items.slice(0, MAX_STORED_ITEMS),
        todayItems: state.todayItems.slice(0, MAX_STORED_ITEMS),
        savedAt: Date.now(),
      }),
    );
  } catch {
    // sessionStorage quota — ignore
  }
}

export function saveJobBoardListScroll(key: string, scrollY: number): void {
  const current = loadJobBoardListRestore(key);
  if (!current) return;
  saveJobBoardListRestore(key, { ...current, scrollY });
}

export function clearJobBoardListRestore(key: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(storageKey(key));
}

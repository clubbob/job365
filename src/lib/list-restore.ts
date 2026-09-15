import { WORK_TYPE_FILTERS } from '@/types/job';

export type ListRestoreState = {
  filter: (typeof WORK_TYPE_FILTERS)[number]['id'];
  workTypes?: string[];
  occupation?: string;
  occupations?: string[];
  region?: string;
  regions?: string[];
  query: string;
  page: number;
  scrollY: number;
};

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

const PREFIX = 'job365.list.';

function isFilterId(value: unknown): value is ListRestoreState['filter'] {
  return WORK_TYPE_FILTERS.some((item) => item.id === value);
}

export function loadListRestore(key: string): ListRestoreState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListRestoreState>;
    if (!isFilterId(parsed.filter)) return null;
    return {
      filter: parsed.filter,
      workTypes: asStringList(parsed.workTypes),
      occupation: typeof parsed.occupation === 'string' ? parsed.occupation : '',
      occupations: asStringList(parsed.occupations),
      region: typeof parsed.region === 'string' ? parsed.region : '',
      regions: asStringList(parsed.regions),
      query: typeof parsed.query === 'string' ? parsed.query : '',
      page: typeof parsed.page === 'number' && parsed.page > 0 ? parsed.page : 1,
      scrollY: typeof parsed.scrollY === 'number' && parsed.scrollY > 0 ? parsed.scrollY : 0,
    };
  } catch {
    return null;
  }
}

export function saveListRestore(key: string, state: ListRestoreState): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(state));
}

export function saveListScroll(key: string, scrollY: number): void {
  const current = loadListRestore(key);
  if (!current) {
    saveListRestore(key, { filter: 'all', query: '', page: 1, scrollY });
    return;
  }
  saveListRestore(key, { ...current, scrollY });
}

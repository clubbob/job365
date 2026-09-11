const STORAGE_KEY = 'job365.workPreferences';

export const REGION_OPTIONS = [
  '전국',
  '재택',
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '광주',
  '대전',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
] as const;

export type RegionOption = (typeof REGION_OPTIONS)[number];

export const NATIONWIDE_REGION = '전국' satisfies RegionOption;
export const SELECTABLE_REGIONS = REGION_OPTIONS.filter(
  (item): item is Exclude<RegionOption, '전국'> => item !== NATIONWIDE_REGION,
);

export function isNationwideSelection(regions: readonly string[]): boolean {
  if (regions.includes(NATIONWIDE_REGION)) return true;
  return SELECTABLE_REGIONS.every((item) => regions.includes(item));
}

export function expandRegions(regions: readonly RegionOption[]): RegionOption[] {
  if (isNationwideSelection(regions)) return [...SELECTABLE_REGIONS];
  return regions.filter((item) => item !== NATIONWIDE_REGION);
}

export function compactRegions(regions: readonly RegionOption[]): RegionOption[] {
  const next = regions.filter((item) => item !== NATIONWIDE_REGION);
  return isNationwideSelection(next) ? [NATIONWIDE_REGION] : next;
}

export function regionsFromLocationText(location: string): RegionOption[] {
  const parts = location
    .split(/[,/·]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const fromParts = parts.filter(isRegionOption);
  if (fromParts.length > 0) return expandRegions(fromParts);
  if (location.includes(NATIONWIDE_REGION)) return [...SELECTABLE_REGIONS];
  return SELECTABLE_REGIONS.filter((item) => location.includes(item));
}

export function locationLabelFromRegions(regions: readonly RegionOption[]): string {
  return compactRegions(regions).join(', ');
}

export function toggleRegionSelection(regions: readonly RegionOption[], value: RegionOption): RegionOption[] {
  const expanded = expandRegions(regions);
  if (value === NATIONWIDE_REGION) {
    return isNationwideSelection(expanded) ? [] : [...SELECTABLE_REGIONS];
  }
  return expanded.includes(value) ? expanded.filter((item) => item !== value) : [...expanded, value];
}

export const OCCUPATION_OPTIONS = [
  '경영·사무',
  '사무보조',
  '회계·세무·재무',
  '마케팅·광고·MD',
  'IT개발·데이터',
  '디자인',
  '영업·판매·무역',
  '매장·판매',
  '유통·물류',
  '배달·운전',
  '고객상담·TM',
  '서비스',
  '외식·음료',
  '전자·기계·R&D',
  '생산·기술·노무',
  '교육',
  '건설·부동산',
  '의료·보건·복지',
  '미디어·문화·스포츠',
  '금융·보험·증권',
  '전문직·법률',
  '기타',
] as const;

export type OccupationOption = (typeof OCCUPATION_OPTIONS)[number];

const LEGACY_OCCUPATIONS: Record<string, OccupationOption> = {
  '사무·행정': '경영·사무',
  '인사·총무': '경영·사무',
  '회계·재무': '회계·세무·재무',
  '마케팅·홍보': '마케팅·광고·MD',
  'IT·개발': 'IT개발·데이터',
  '영업·판매': '영업·판매·무역',
  '물류·배송': '유통·물류',
  '고객상담·CS': '고객상담·TM',
  '서비스·외식': '외식·음료',
  '생산·제조': '생산·기술·노무',
  '교육·강사': '교육',
  '의료·간호': '의료·보건·복지',
  '행사·프로모션': '마케팅·광고·MD',
  '돌봄·요양': '의료·보건·복지',
};

function normalizeOccupation(value: unknown): OccupationOption | null {
  if (typeof value !== 'string') return null;
  if (isOccupationOption(value)) return value;
  return LEGACY_OCCUPATIONS[value] ?? null;
}

export type WorkPreferences = {
  regions: RegionOption[];
  occupations: OccupationOption[];
  updatedAt: string;
};

type Store = Record<string, WorkPreferences>;

export function isRegionOption(value: unknown): value is RegionOption {
  return typeof value === 'string' && (REGION_OPTIONS as readonly string[]).includes(value);
}

function isOccupationOption(value: unknown): value is OccupationOption {
  return typeof value === 'string' && (OCCUPATION_OPTIONS as readonly string[]).includes(value);
}

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadWorkPreferences(userId: string): WorkPreferences | null {
  const record = readStore()[userId];
  if (!record) return null;
  return {
    regions: expandRegions(record.regions.filter(isRegionOption)),
    occupations: [...new Set(record.occupations.map(normalizeOccupation).filter((item): item is OccupationOption => Boolean(item)))],
    updatedAt: record.updatedAt,
  };
}

export function saveWorkPreferences(
  userId: string,
  input: { regions: RegionOption[]; occupations: OccupationOption[] },
): WorkPreferences {
  const next: WorkPreferences = {
    regions: compactRegions(input.regions),
    occupations: input.occupations,
    updatedAt: new Date().toISOString(),
  };
  const store = readStore();
  store[userId] = next;
  writeStore(store);
  return next;
}

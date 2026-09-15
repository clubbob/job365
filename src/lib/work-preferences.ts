import { isJobWorkType, type JobWorkType } from '@/types/job';
import { talentWorkTypes, type TalentProfile } from '@/types/talent';

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

export const AVAILABLE_OPTIONS = ['즉시 가능', '2주 후', '1개월 후', '3개월 후'] as const;

export type AvailableOption = (typeof AVAILABLE_OPTIONS)[number];

export function isAvailableOption(value: unknown): value is AvailableOption {
  return typeof value === 'string' && (AVAILABLE_OPTIONS as readonly string[]).includes(value);
}

export function normalizeAvailable(value: string): AvailableOption | '' {
  const text = value.trim();
  if (isAvailableOption(text)) return text;
  if (/즉시/.test(text)) return '즉시 가능';
  if (/2주/.test(text)) return '2주 후';
  if (/3개월/.test(text)) return '3개월 후';
  if (/1개월|한\s*달|한달/.test(text)) return '1개월 후';
  return '';
}

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
  workTypes: JobWorkType[];
  available: AvailableOption | '';
  hasJobConditions: boolean;
  updatedAt: string;
};

export type WorkPreferenceInput = {
  regions: RegionOption[];
  occupations: OccupationOption[];
  workTypes: JobWorkType[];
  available: AvailableOption | '';
};

type StoredWorkPreferences = Omit<WorkPreferences, 'hasJobConditions'> & {
  workType?: JobWorkType | '';
};
type Store = Record<string, StoredWorkPreferences>;

export function isRegionOption(value: unknown): value is RegionOption {
  return typeof value === 'string' && (REGION_OPTIONS as readonly string[]).includes(value);
}

export function isOccupationOption(value: unknown): value is OccupationOption {
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

function parseStoredWorkTypes(record: StoredWorkPreferences): JobWorkType[] {
  if (Array.isArray(record.workTypes)) {
    return [...new Set(record.workTypes.filter(isJobWorkType))];
  }
  return typeof record.workType === 'string' && isJobWorkType(record.workType) ? [record.workType] : [];
}

export function loadWorkPreferences(userId: string): WorkPreferences | null {
  const record = readStore()[userId];
  if (!record) return null;
  return {
    regions: expandRegions(record.regions.filter(isRegionOption)),
    occupations: [...new Set(record.occupations.map(normalizeOccupation).filter((item): item is OccupationOption => Boolean(item)))],
    workTypes: parseStoredWorkTypes(record),
    available: normalizeAvailable(typeof record.available === 'string' ? record.available : ''),
    hasJobConditions:
      Object.prototype.hasOwnProperty.call(record, 'workTypes') ||
      Object.prototype.hasOwnProperty.call(record, 'workType'),
    updatedAt: record.updatedAt,
  };
}

export function saveWorkPreferences(userId: string, input: WorkPreferenceInput): WorkPreferences {
  const workTypes = [...new Set(input.workTypes.filter(isJobWorkType))];
  const next: StoredWorkPreferences = {
    regions: compactRegions(input.regions),
    occupations: input.occupations,
    workTypes,
    workType: workTypes[0] ?? '',
    available: normalizeAvailable(input.available),
    updatedAt: new Date().toISOString(),
  };
  const store = readStore();
  store[userId] = next;
  writeStore(store);
  return { ...next, workTypes, hasJobConditions: true };
}

export function headlineFromOccupations(occupations: readonly string[]): string {
  return occupations.filter(Boolean).join(', ');
}

export function talentFieldsFromWorkPreferences(
  prefs: WorkPreferences,
): Partial<Pick<TalentProfile, 'workType' | 'workTypes' | 'available' | 'desiredPay' | 'payType' | 'payAmount' | 'payNegotiable' | 'location' | 'headline'>> {
  const location = locationLabelFromRegions(prefs.regions);
  if (!prefs.hasJobConditions) {
    return location ? { location } : {};
  }
  return {
    workType: prefs.workTypes[0] ?? '',
    workTypes: prefs.workTypes,
    available: prefs.available,
    desiredPay: '',
    payType: undefined,
    payAmount: '',
    payNegotiable: false,
    location,
  };
}

export function workPreferencesAreComplete(
  prefs: WorkPreferenceInput | WorkPreferences | null | undefined,
): boolean {
  if (!prefs) return false;
  return prefs.workTypes.length > 0 && prefs.regions.length > 0 && prefs.occupations.length > 0 && Boolean(prefs.available);
}

export function isWorkPreferencesComplete(userId: string): boolean {
  return workPreferencesAreComplete(loadWorkPreferences(userId));
}

export function occupationsFromTalent(profile: Pick<TalentProfile, 'occupations' | 'headline'>): OccupationOption[] {
  const fromList = profile.occupations?.map(normalizeOccupation).filter((item): item is OccupationOption => Boolean(item)) ?? [];
  if (fromList.length > 0) return [...new Set(fromList)];
  return [...new Set(
    (profile.headline ?? '')
      .split(',')
      .map((item) => normalizeOccupation(item.trim()))
      .filter((item): item is OccupationOption => Boolean(item)),
  )];
}

export function workPreferencesFromTalent(profile: TalentProfile): WorkPreferenceInput {
  return {
    workTypes: talentWorkTypes(profile),
    regions: regionsFromLocationText(profile.location ?? ''),
    occupations: occupationsFromTalent(profile),
    available: normalizeAvailable(profile.available ?? ''),
  };
}

export function talentHasCompleteWorkPreferences(profile: TalentProfile): boolean {
  return workPreferencesAreComplete(workPreferencesFromTalent(profile));
}

export function occupationsFromList(values?: readonly string[] | null): OccupationOption[] {
  return [
    ...new Set(
      (values ?? [])
        .map(normalizeOccupation)
        .filter((item): item is OccupationOption => Boolean(item)),
    ),
  ];
}

export function occupationsFromJob(job: { occupations?: readonly string[] }): OccupationOption[] {
  return occupationsFromList(job.occupations);
}

export function regionsFromJob(job: { regions?: readonly string[]; location?: string }): RegionOption[] {
  const fromList = (job.regions ?? []).filter(isRegionOption);
  if (fromList.length > 0) return expandRegions(fromList);
  return regionsFromLocationText(job.location ?? '');
}

export function jobOccupationsLabel(job: { occupations?: readonly string[] }): string {
  return occupationsFromJob(job).join(', ');
}

export function jobRegionsLabel(job: { regions?: readonly string[]; location?: string }): string {
  const regions = regionsFromJob(job);
  if (regions.length === 0) return (job.location ?? '').trim();
  return locationLabelFromRegions(compactRegions(regions));
}

export function jobMatchesOccupation(
  job: { occupations?: readonly string[] },
  occupation: OccupationOption,
): boolean {
  return occupationsFromJob(job).includes(occupation);
}

export function jobMatchesRegion(
  job: { regions?: readonly string[]; location?: string },
  region: RegionOption,
): boolean {
  const regions = regionsFromJob(job);
  if (region === NATIONWIDE_REGION) return isNationwideSelection(regions);
  if (isNationwideSelection(regions)) return true;
  return regions.includes(region);
}

export function talentMatchesOccupation(
  talent: Pick<TalentProfile, 'occupations' | 'headline'>,
  occupation: OccupationOption,
): boolean {
  return occupationsFromTalent(talent).includes(occupation);
}

export function talentMatchesRegion(
  talent: Pick<TalentProfile, 'location'>,
  region: RegionOption,
): boolean {
  const regions = regionsFromLocationText(talent.location ?? '');
  if (region === NATIONWIDE_REGION) return isNationwideSelection(regions);
  if (isNationwideSelection(regions)) return true;
  return regions.includes(region);
}

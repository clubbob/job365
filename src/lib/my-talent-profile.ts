import { getKoreaDateLocalToday } from '@/lib/datetime';
import {
  headlineFromOccupations,
  loadWorkPreferences,
  occupationsFromTalent,
  talentFieldsFromWorkPreferences,
  talentHasCompleteWorkPreferences,
} from '@/lib/work-preferences';
import {
  isCompleteTalentProfile,
  isPublishedTalent,
  missingTalentPublishFields,
  withSavedTalentState,
  withTalentPublishState,
  type TalentProfile,
} from '@/types/talent';

const STORAGE_KEY = 'job365.myTalentProfiles';

type Store = Record<string, TalentProfile[]>;

function isTalentProfile(value: unknown): value is TalentProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as TalentProfile;
  return typeof profile.id === 'string' && typeof profile.name === 'string';
}

function asProfiles(value: unknown): TalentProfile[] {
  if (Array.isArray(value)) return value.filter(isTalentProfile).map(withTitle);
  if (isTalentProfile(value)) return [withTitle(value)];
  return [];
}

function withTitle(profile: TalentProfile): TalentProfile {
  return { ...profile, title: profile.title ?? '' };
}

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const store: Store = {};
    for (const [userId, value] of Object.entries(parsed)) {
      const profiles = asProfiles(value);
      if (profiles.length > 0) store[userId] = profiles;
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function sortByRecent(profiles: TalentProfile[]): TalentProfile[] {
  return [...profiles].sort((a, b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt),
  );
}

export function createTalentProfileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `talent-${crypto.randomUUID()}`;
  }
  return `talent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listMyTalentProfilesForUser(userId: string): TalentProfile[] {
  return sortByRecent(readStore()[userId] ?? []);
}

export function loadMyTalentProfile(userId: string): TalentProfile | null {
  return listMyTalentProfilesForUser(userId)[0] ?? null;
}

export function getMyTalentProfile(userId: string, profileId: string): TalentProfile | null {
  return listMyTalentProfilesForUser(userId).find((item) => item.id === profileId) ?? null;
}

export function listMyTalentProfiles(): TalentProfile[] {
  return sortByRecent(Object.values(readStore()).flat());
}

export function listMyTalentProfilesWithOwners(): Array<{ userId: string; profile: TalentProfile }> {
  return Object.entries(readStore()).flatMap(([userId, profiles]) =>
    profiles.map((profile) => ({ userId, profile })),
  );
}

export function findMyTalentProfile(id: string): { userId: string; profile: TalentProfile } | null {
  const byProfileId = listMyTalentProfilesWithOwners().find((item) => item.profile.id === id);
  if (byProfileId) return byProfileId;
  const owned = sortByRecent(
    listMyTalentProfilesWithOwners()
      .filter((item) => item.userId === id)
      .map((item) => item.profile),
  );
  return owned[0] ? { userId: id, profile: owned[0] } : null;
}

export function createEmptyTalentProfile(_userId: string, nickname = '', profileId?: string): TalentProfile {
  const today = getKoreaDateLocalToday();
  return withTalentPublishState({
    id: profileId || createTalentProfileId(),
    title: '',
    name: nickname.trim(),
    headline: '',
    workType: '',
    workTypes: [],
    careerLabel: '',
    education: '',
    location: '',
    desiredPay: '',
    summary: '',
    experience: '',
    available: '',
    occupations: [],
    schools: [],
    tags: [],
    createdAt: today,
    updatedAt: today,
  });
}

function withAccountWorkPreferencesIfMissing(userId: string, profile: TalentProfile): TalentProfile {
  const prefs = loadWorkPreferences(userId);
  let next = profile;

  if (!talentHasCompleteWorkPreferences(profile) && prefs) {
    const headline = profile.headline?.trim() || headlineFromOccupations(prefs.occupations);
    next = {
      ...profile,
      ...talentFieldsFromWorkPreferences(prefs),
      occupations: profile.occupations?.length ? profile.occupations : prefs.occupations,
      ...(headline ? { headline } : {}),
    };
  }

  const occupations = occupationsFromTalent(next);
  const fallback = occupations.length > 0 ? occupations : prefs?.occupations ?? [];
  if (fallback.length > 0 && !next.occupations?.some((item) => item.trim())) {
    next = {
      ...next,
      occupations: fallback,
      headline: next.headline?.trim() || headlineFromOccupations(fallback),
    };
  }
  return next;
}

export function hydrateMissingWorkPreferencesFromAccount(userId: string): TalentProfile[] {
  const store = readStore();
  const current = store[userId] ?? [];
  if (current.length === 0) return [];
  const next = current.map((item) => withAccountWorkPreferencesIfMissing(userId, withTitle(item)));
  store[userId] = next;
  writeStore(store);
  return next;
}

export function saveMyTalentProfile(
  userId: string,
  profile: TalentProfile,
  options?: { asDraft?: boolean },
): TalentProfile {
  const titled = withTitle(profile);
  const next = options?.asDraft ? { ...titled, draft: true } : withSavedTalentState(titled);
  const store = readStore();
  const current = store[userId] ?? [];
  const others = current
    .filter((item) => item.id !== next.id)
    .map((item) => (next.draft === false && isPublishedTalent(item) ? { ...item, draft: true } : item));
  store[userId] = [next, ...others];
  writeStore(store);
  return next;
}

export function missingPublishRequirements(userId: string, profile: TalentProfile): string[] {
  const latest = getMyTalentProfile(userId, profile.id) ?? profile;
  return missingTalentPublishFields(latest);
}

export function canPublishMyTalentProfile(userId: string, profile: TalentProfile): boolean {
  return missingPublishRequirements(userId, profile).length === 0;
}

export function missingApplyRequirements(userId: string): string[] {
  const hasCompleteResume = listMyTalentProfilesForUser(userId).some(isCompleteTalentProfile);
  return hasCompleteResume ? [] : ['이력서'];
}

export function findApplyReadyResume(userId: string): TalentProfile | null {
  if (missingApplyRequirements(userId).length > 0) return null;
  const complete = listMyTalentProfilesForUser(userId).filter(isCompleteTalentProfile);
  return complete.find(isPublishedTalent) ?? complete[0] ?? null;
}

export function publishMyTalentProfile(userId: string, profileId: string): TalentProfile | null {
  const target = getMyTalentProfile(userId, profileId);
  if (!target || !canPublishMyTalentProfile(userId, target)) return null;
  const store = readStore();
  const current = store[userId] ?? [];
  const today = getKoreaDateLocalToday();
  store[userId] = current.map((item) => {
    if (item.id === profileId) return { ...target, draft: false, updatedAt: today };
    if (isPublishedTalent(item)) return { ...item, draft: true };
    return item;
  });
  writeStore(store);
  return store[userId].find((item) => item.id === profileId) ?? null;
}

export function unpublishMyTalentProfile(userId: string, profileId: string): TalentProfile | null {
  const target = getMyTalentProfile(userId, profileId);
  if (!target) return null;
  return saveMyTalentProfile(userId, { ...target, draft: true }, { asDraft: true });
}

export function duplicateMyTalentProfile(userId: string, profileId: string): TalentProfile | null {
  const source = getMyTalentProfile(userId, profileId);
  if (!source) return null;
  const today = getKoreaDateLocalToday();
  const baseTitle = source.title?.trim() || source.headline?.trim() || source.name?.trim() || '이력서';
  return saveMyTalentProfile(
    userId,
    {
      ...source,
      id: createTalentProfileId(),
      title: `${baseTitle} 복사`,
      createdAt: today,
      updatedAt: today,
    },
    { asDraft: true },
  );
}

export function deleteMyTalentProfile(userId: string): boolean {
  const store = readStore();
  if (!(userId in store)) return false;
  delete store[userId];
  writeStore(store);
  return true;
}

export function deleteMyTalentProfileById(id: string): boolean {
  const store = readStore();
  let changed = false;
  for (const [userId, profiles] of Object.entries(store)) {
    const next = profiles.filter((item) => item.id !== id);
    if (next.length === profiles.length) continue;
    changed = true;
    if (next.length === 0) delete store[userId];
    else store[userId] = next;
  }
  if (changed) writeStore(store);
  return changed;
}

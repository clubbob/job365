import { getKoreaDateLocalToday } from '@/lib/datetime';
import { withTalentPublishState, type TalentProfile } from '@/types/talent';

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
    careerLabel: '',
    education: '',
    location: '',
    desiredPay: '',
    summary: '',
    experience: '',
    available: '',
    tags: [],
    createdAt: today,
    updatedAt: today,
  });
}

export function saveMyTalentProfile(
  userId: string,
  profile: TalentProfile,
  options?: { asDraft?: boolean },
): TalentProfile {
  const next = options?.asDraft ? { ...withTitle(profile), draft: true } : withTalentPublishState(withTitle(profile));
  const store = readStore();
  const current = store[userId] ?? [];
  store[userId] = [next, ...current.filter((item) => item.id !== next.id)];
  writeStore(store);
  return next;
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

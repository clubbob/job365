import { isEducationLevel, type TalentProfile } from '@/types/talent';

const STORAGE_KEY = 'job365.myTalentProfiles';

type ProfileStore = Record<string, TalentProfile>;

function readStore(): ProfileStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProfileStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProfileStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadMyTalentProfile(userId: string): TalentProfile | null {
  return readStore()[userId] ?? null;
}

export function listMyTalentProfiles(): TalentProfile[] {
  return Object.values(readStore()).filter((profile) => isEducationLevel(profile.education));
}

export function listMyTalentProfilesWithOwners(): Array<{ userId: string; profile: TalentProfile }> {
  return Object.entries(readStore()).map(([userId, profile]) => ({ userId, profile }));
}

export function findMyTalentProfile(id: string): { userId: string; profile: TalentProfile } | null {
  return (
    listMyTalentProfilesWithOwners().find((item) => item.profile.id === id || item.userId === id) ?? null
  );
}

export function saveMyTalentProfile(userId: string, profile: TalentProfile): void {
  if (!isEducationLevel(profile.education)) return;
  const store = readStore();
  store[userId] = profile;
  writeStore(store);
}

export function deleteMyTalentProfile(userId: string): boolean {
  const store = readStore();
  if (!(userId in store)) return false;
  delete store[userId];
  writeStore(store);
  return true;
}

export function deleteMyTalentProfileById(id: string): boolean {
  const found = findMyTalentProfile(id);
  if (!found) return false;
  return deleteMyTalentProfile(found.userId);
}

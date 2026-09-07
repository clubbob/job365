import type { TalentProfile } from '@/types/talent';

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
  return Object.values(readStore());
}

export function saveMyTalentProfile(userId: string, profile: TalentProfile): void {
  const store = readStore();
  store[userId] = profile;
  writeStore(store);
}

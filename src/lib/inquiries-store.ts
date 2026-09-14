import { isInquiry, type Inquiry } from '@/lib/inquiry';

const STORAGE_KEY = 'job365.inquiries';

type Store = Record<string, Inquiry[]>;

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

function sortByRecent(items: Inquiry[]): Inquiry[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createInquiryId(userId: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `inquiry-${userId}-${crypto.randomUUID()}`;
  }
  return `inquiry-${userId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveInquiry(inquiry: Inquiry): Inquiry {
  const store = readStore();
  const current = store[inquiry.userId] ?? [];
  store[inquiry.userId] = [inquiry, ...current.filter((item) => item.id !== inquiry.id)];
  writeStore(store);
  return inquiry;
}

export function listInquiries(userId?: string): Inquiry[] {
  const store = readStore();
  if (userId) return sortByRecent(store[userId] ?? []);
  return sortByRecent(Object.values(store).flat().filter(isInquiry));
}

export function getInquiry(id: string): Inquiry | null {
  return listInquiries().find((item) => item.id === id) ?? null;
}

export function deleteInquiry(id: string): boolean {
  const store = readStore();
  let changed = false;
  for (const [userId, items] of Object.entries(store)) {
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) continue;
    changed = true;
    if (next.length === 0) delete store[userId];
    else store[userId] = next;
  }
  if (changed) writeStore(store);
  return changed;
}

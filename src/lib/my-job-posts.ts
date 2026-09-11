import type { JobPosting } from '@/types/job';

const STORAGE_KEY = 'job365.myJobPostings';

type Store = Record<string, JobPosting[]>;

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

export function listMyJobPostings(userId?: string): JobPosting[] {
  const store = readStore();
  if (userId) return store[userId] ?? [];
  return Object.values(store).flat();
}

export function getMyJobPosting(userId: string, jobId: string): JobPosting | null {
  return listMyJobPostings(userId).find((item) => item.id === jobId) ?? null;
}

export function listMyJobPostingsWithOwners(): Array<{ userId: string; job: JobPosting }> {
  const store = readStore();
  return Object.entries(store).flatMap(([userId, jobs]) => jobs.map((job) => ({ userId, job })));
}

export function findMyJobPosting(jobId: string): { userId: string; job: JobPosting } | null {
  return listMyJobPostingsWithOwners().find((item) => item.job.id === jobId) ?? null;
}

export function saveMyJobPosting(userId: string, job: JobPosting): void {
  const store = readStore();
  const current = store[userId] ?? [];
  store[userId] = [job, ...current.filter((item) => item.id !== job.id)];
  writeStore(store);
}

export function deleteMyJobPosting(userId: string, jobId: string): boolean {
  const store = readStore();
  const current = store[userId] ?? [];
  const next = current.filter((item) => item.id !== jobId);
  if (next.length === current.length) return false;
  if (next.length === 0) delete store[userId];
  else store[userId] = next;
  writeStore(store);
  return true;
}

export function deleteMyJobPostingById(jobId: string): boolean {
  const found = findMyJobPosting(jobId);
  if (!found) return false;
  return deleteMyJobPosting(found.userId, jobId);
}

export function deleteAllMyJobPostings(userId: string): void {
  const store = readStore();
  if (!(userId in store)) return;
  delete store[userId];
  writeStore(store);
}

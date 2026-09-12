import { digitsOnly } from '@/lib/business-number';
import { getKoreaDateTimeLocalMin } from '@/lib/datetime';
import { listJobs } from '@/lib/job-catalog';
import type { JobPosting } from '@/types/job';

export type FollowedCompany = {
  key: string;
  companyName: string;
  businessNumber?: string;
  followedAt: string;
};

const STORAGE_KEY = 'job365.followedCompanies';

type Store = Record<string, FollowedCompany[]>;

export function followedCompanyKey(companyName: string, businessNumber?: string): string {
  const biz = digitsOnly(businessNumber ?? '');
  if (biz.length > 0) return `biz:${biz}`;
  return `name:${companyName.trim()}`;
}

function isFollowedCompany(value: unknown): value is FollowedCompany {
  if (!value || typeof value !== 'object') return false;
  const item = value as FollowedCompany;
  return typeof item.key === 'string' && typeof item.companyName === 'string' && typeof item.followedAt === 'string';
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
      if (!Array.isArray(value)) continue;
      const items = value.filter(isFollowedCompany);
      if (items.length > 0) store[userId] = items;
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listFollowedCompanies(userId: string): FollowedCompany[] {
  return [...(readStore()[userId] ?? [])].sort((a, b) => b.followedAt.localeCompare(a.followedAt));
}

export function isCompanyFollowed(userId: string, job: Pick<JobPosting, 'companyName' | 'businessNumber'>): boolean {
  const key = followedCompanyKey(job.companyName, job.businessNumber);
  return listFollowedCompanies(userId).some((item) => item.key === key);
}

export function followCompany(userId: string, job: Pick<JobPosting, 'companyName' | 'businessNumber'>): FollowedCompany {
  const key = followedCompanyKey(job.companyName, job.businessNumber);
  const existing = listFollowedCompanies(userId).find((item) => item.key === key);
  if (existing) return existing;

  const company: FollowedCompany = {
    key,
    companyName: job.companyName.trim(),
    businessNumber: digitsOnly(job.businessNumber ?? '') || undefined,
    followedAt: getKoreaDateTimeLocalMin(),
  };
  const store = readStore();
  store[userId] = [company, ...(store[userId] ?? [])];
  writeStore(store);
  return company;
}

export function unfollowCompany(userId: string, key: string): boolean {
  const store = readStore();
  const current = store[userId] ?? [];
  const next = current.filter((item) => item.key !== key);
  if (next.length === current.length) return false;
  if (next.length === 0) delete store[userId];
  else store[userId] = next;
  writeStore(store);
  return true;
}

export function jobMatchesFollowedCompany(
  job: Pick<JobPosting, 'companyName' | 'businessNumber'>,
  company: Pick<FollowedCompany, 'companyName' | 'businessNumber'>,
): boolean {
  const jobBiz = digitsOnly(job.businessNumber ?? '');
  const followedBiz = digitsOnly(company.businessNumber ?? '');
  if (jobBiz && followedBiz) return jobBiz === followedBiz;
  return job.companyName.trim() === company.companyName.trim();
}

export function listFollowedCompanyJobs(userId: string): JobPosting[] {
  const companies = listFollowedCompanies(userId);
  if (companies.length === 0) return [];
  return listJobs().filter((job) => companies.some((company) => jobMatchesFollowedCompany(job, company)));
}

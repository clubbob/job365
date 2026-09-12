import { digitsOnly } from '@/lib/business-number';
import { loadBizVerify } from '@/lib/biz-verify-store';
import { getKoreaDateTimeLocalMin } from '@/lib/datetime';
import { jobMatchesFollowedCompany } from '@/lib/followed-companies';
import { findMyTalentProfile } from '@/lib/my-talent-profile';
import { listMyJobPostings } from '@/lib/my-job-posts';
import type { JobPosting } from '@/types/job';

export type ResumeViewBlock = {
  key: string;
  companyName: string;
  businessNumber?: string;
  recruiterId?: string;
  blockedAt: string;
};

const STORAGE_KEY = 'job365.resumeViewBlocks';

type Store = Record<string, ResumeViewBlock[]>;

function isResumeViewBlock(value: unknown): value is ResumeViewBlock {
  if (!value || typeof value !== 'object') return false;
  const item = value as ResumeViewBlock;
  return typeof item.key === 'string' && typeof item.companyName === 'string' && typeof item.blockedAt === 'string';
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
      const items = value.filter(isResumeViewBlock);
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

export function recruiterCompanyFromJobs(
  recruiterId: string,
): Pick<JobPosting, 'companyName' | 'businessNumber'> | null {
  return recruiterCompaniesForViewer(recruiterId)[0] ?? null;
}

export function recruiterCompaniesForViewer(
  recruiterId: string,
): Array<Pick<JobPosting, 'companyName' | 'businessNumber'>> {
  const seen = new Set<string>();
  const companies: Array<Pick<JobPosting, 'companyName' | 'businessNumber'>> = [];

  function add(companyName: string, businessNumber?: string) {
    const name = companyName.trim();
    if (!name) return;
    const key = `${digitsOnly(businessNumber ?? '')}|${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    companies.push({ companyName: name, businessNumber });
  }

  const verified = loadBizVerify(recruiterId);
  if (verified) add(verified.companyName, verified.businessNumber);
  for (const job of listMyJobPostings(recruiterId)) {
    add(job.companyName, job.businessNumber);
  }
  return companies;
}

export function listResumeViewBlocks(userId: string): ResumeViewBlock[] {
  return [...(readStore()[userId] ?? [])].sort((a, b) => b.blockedAt.localeCompare(a.blockedAt));
}

export function saveResumeViewBlocks(userId: string, blocks: ResumeViewBlock[]): ResumeViewBlock[] {
  const store = readStore();
  const next = blocks.map((item) => ({
    ...item,
    companyName: item.companyName.trim(),
    businessNumber: digitsOnly(item.businessNumber ?? '') || undefined,
    blockedAt: item.blockedAt || getKoreaDateTimeLocalMin(),
  }));
  if (next.length === 0) delete store[userId];
  else store[userId] = next;
  writeStore(store);
  return listResumeViewBlocks(userId);
}

export function isTalentHiddenFromViewer(talentId: string, viewerId: string): boolean {
  const owned = findMyTalentProfile(talentId);
  if (!owned) return false;
  const blocks = listResumeViewBlocks(owned.userId);
  if (blocks.length === 0) return false;
  const identities = recruiterCompaniesForViewer(viewerId);
  return blocks.some((block) => {
    if (block.recruiterId && block.recruiterId === viewerId) return true;
    return identities.some((identity) => jobMatchesFollowedCompany(identity, block));
  });
}

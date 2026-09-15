import { isCompanyInfoComplete, isJobCompanyComplete, loadBizVerify, toJobCompanyInfo } from '@/lib/biz-verify-store';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { occupationsFromJob, regionsFromJob } from '@/lib/work-preferences';
import {
  isJobCareerType,
  isJobEducation,
  isJobPayType,
  isPublishedJob,
  jobWorkTypes,
  type JobPosting,
} from '@/types/job';

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
  window.dispatchEvent(new Event('job365.jobs'));
}

export function listMyJobPostings(userId?: string): JobPosting[] {
  const store = readStore();
  if (userId) return store[userId] ?? [];
  return Object.values(store).flat();
}

export function getMyJobPosting(userId: string, jobId: string): JobPosting | null {
  return listMyJobPostings(userId).find((item) => item.id === jobId) ?? null;
}

export function resolveLatestJob(userId: string, job: JobPosting): JobPosting {
  return getMyJobPosting(userId, job.id) ?? job;
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

export function hydrateMissingCompanyFromAccount(userId: string): JobPosting[] {
  const company = loadBizVerify(userId);
  const info = toJobCompanyInfo(company);
  const current = listMyJobPostings(userId);
  if (!info || current.length === 0) return current;
  let changed = false;
  const next = current.map((job) => {
    if (job.company?.companyName?.trim() || job.companyName.trim()) return job;
    changed = true;
    return {
      ...job,
      companyName: info.companyName || job.companyName,
      businessNumber: job.businessNumber || info.businessNumber,
      company: info,
    };
  });
  if (!changed) return current;
  const store = readStore();
  store[userId] = next;
  writeStore(store);
  return next;
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

export function listPublishedMyJobPostings(userId?: string): JobPosting[] {
  return listMyJobPostings(userId).filter(isPublishedJob);
}

export function createJobPostingId(userId: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `job-me-${userId}-${crypto.randomUUID()}`;
  }
  return `job-me-${userId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function missingJobPublishRequirements(userId: string, job: JobPosting): string[] {
  const latest = getMyJobPosting(userId, job.id) ?? job;
  const missing: string[] = [];
  if (!isJobCompanyComplete(latest.company) && !isCompanyInfoComplete(loadBizVerify(userId))) missing.push('회사 정보');
  if (!latest.title.trim()) missing.push('채용 제목');
  if (jobWorkTypes(latest).length === 0) missing.push('근무 형태');
  if (!regionsFromJob(latest).length) missing.push('근무 지역');
  if (!occupationsFromJob(latest).length) missing.push('직종');
  if (!latest.headcount || latest.headcount < 1) missing.push('모집 인원');
  if (!isJobPayType(latest.payType) || !latest.payLabel.trim()) missing.push('급여');
  if (!latest.careerType || !isJobCareerType(latest.careerType)) missing.push('경력 유무');
  if (!latest.education || !isJobEducation(latest.education)) missing.push('학력');
  if (!latest.workDays?.trim()) missing.push('근무 요일');
  if (!latest.workHours?.trim()) missing.push('근무 시간');
  if (!latest.deadline?.trim()) missing.push('접수 마감');
  if (!latest.summary.trim()) missing.push('담당 업무');
  if (!latest.process?.trim()) missing.push('전형 절차');
  return missing;
}

export function canPublishMyJobPosting(userId: string, job: JobPosting): boolean {
  return missingJobPublishRequirements(userId, job).length === 0;
}

export function publishMyJobPosting(userId: string, jobId: string): JobPosting | null {
  const target = getMyJobPosting(userId, jobId);
  if (!target || !canPublishMyJobPosting(userId, target)) return null;
  const company = target.company ?? toJobCompanyInfo(loadBizVerify(userId));
  const next = {
    ...target,
    status: 'published' as const,
    createdAt: getKoreaDateLocalToday(),
    updatedAt: getKoreaDateLocalToday(),
    company: company
      ? {
          ...company,
          companyName: target.companyName.trim() || company.companyName,
          businessNumber: target.businessNumber || company.businessNumber,
        }
      : target.company,
  };
  saveMyJobPosting(userId, next);
  return next;
}

export function unpublishMyJobPosting(userId: string, jobId: string): JobPosting | null {
  const target = getMyJobPosting(userId, jobId);
  if (!target) return null;
  const next = { ...target, status: 'draft' as const, updatedAt: getKoreaDateLocalToday() };
  saveMyJobPosting(userId, next);
  return next;
}

export function duplicateMyJobPosting(userId: string, jobId: string): JobPosting | null {
  const source = getMyJobPosting(userId, jobId);
  if (!source) return null;
  const next: JobPosting = {
    ...source,
    id: createJobPostingId(userId),
    title: `${source.title.trim() || '채용 정보'} 복사`,
    status: 'draft',
    createdAt: getKoreaDateLocalToday(),
    updatedAt: getKoreaDateLocalToday(),
  };
  saveMyJobPosting(userId, next);
  return next;
}

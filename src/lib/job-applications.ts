import { getKoreaDateTimeLocalMin } from '@/lib/datetime';
import { talentResumeTitle } from '@/lib/talent-display';
import type { JobPosting } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

export type JobApplicationStatus = 'applied' | 'passed' | 'rejected';

export const JOB_APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  applied: '입사 지원 완료',
  passed: '합격',
  rejected: '불합격',
};

export type JobApplication = {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  jobTitle: string;
  companyName: string;
  resumeTitle: string;
  appliedAt: string;
  status: JobApplicationStatus;
  hiddenFromList?: boolean;
  hiddenFromRecruiterList?: boolean;
};

const STORAGE_KEY = 'job365.jobApplications';

type Store = Record<string, JobApplication[]>;

function isJobApplication(value: unknown): value is JobApplication {
  if (!value || typeof value !== 'object') return false;
  const item = value as JobApplication;
  return (
    typeof item.id === 'string' &&
    typeof item.userId === 'string' &&
    typeof item.jobId === 'string' &&
    typeof item.resumeId === 'string' &&
    typeof item.jobTitle === 'string' &&
    typeof item.companyName === 'string' &&
    typeof item.appliedAt === 'string'
  );
}

function withDefaults(item: JobApplication): JobApplication {
  return {
    ...item,
    resumeTitle: item.resumeTitle ?? '',
    status: item.status === 'passed' || item.status === 'rejected' ? item.status : 'applied',
  };
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
      const items = value.filter(isJobApplication).map(withDefaults);
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

function createJobApplicationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `application-${crypto.randomUUID()}`;
  }
  return `application-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortByRecent(items: JobApplication[]): JobApplication[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byTime = b.item.appliedAt.localeCompare(a.item.appliedAt);
      if (byTime !== 0) return byTime;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function jobApplicationDateLabel(appliedAt: string): string {
  return appliedAt.slice(0, 10);
}

/** 구직자 입사 지원 현황. 목록에서 삭제한 건은 기본적으로 빼 둔다. */
export function listMyJobApplications(
  userId: string,
  options?: { includeHidden?: boolean },
): JobApplication[] {
  const items = sortByRecent(readStore()[userId] ?? []);
  if (options?.includeHidden) return items;
  return items.filter((item) => !item.hiddenFromList);
}

export function getJobApplication(userId: string, jobId: string): JobApplication | null {
  return listMyJobApplications(userId, { includeHidden: true }).find((item) => item.jobId === jobId) ?? null;
}

export function listApplicationsForJob(jobId: string): JobApplication[] {
  return listApplicationsForJobs([jobId]);
}

export function listApplicationsForJobs(jobIds: string[]): JobApplication[] {
  const ids = new Set(jobIds);
  if (ids.size === 0) return [];
  return sortByRecent(
    Object.values(readStore())
      .flat()
      .filter((item) => ids.has(item.jobId) && !item.hiddenFromRecruiterList),
  );
}

export function updateJobApplicationStatus(
  applicationId: string,
  status: JobApplicationStatus,
): JobApplication | null {
  const store = readStore();
  for (const [userId, items] of Object.entries(store)) {
    const index = items.findIndex((item) => item.id === applicationId);
    if (index < 0) continue;
    const next = { ...items[index], status };
    store[userId] = items.map((item, itemIndex) => (itemIndex === index ? next : item));
    writeStore(store);
    return next;
  }
  return null;
}

/** 구직자 현황 목록에서만 숨긴다. 지원 기록과 구인자 측 목록은 그대로 둔다. */
export function hideJobApplicationFromList(userId: string, applicationId: string): boolean {
  const store = readStore();
  const current = store[userId] ?? [];
  let changed = false;
  const next = current.map((item) => {
    if (item.id !== applicationId || item.hiddenFromList) return item;
    changed = true;
    return { ...item, hiddenFromList: true };
  });
  if (!changed) return false;
  store[userId] = next;
  writeStore(store);
  return true;
}

/** 구인자 받은 입사 지원 목록에서만 숨긴다. 지원 기록과 구직자 측 목록은 그대로 둔다. */
export function hideJobApplicationFromRecruiterList(applicationId: string): boolean {
  const store = readStore();
  for (const [userId, items] of Object.entries(store)) {
    const index = items.findIndex((item) => item.id === applicationId);
    if (index < 0) continue;
    if (items[index].hiddenFromRecruiterList) return false;
    store[userId] = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, hiddenFromRecruiterList: true } : item,
    );
    writeStore(store);
    return true;
  }
  return false;
}

export function applyToJob(
  userId: string,
  job: JobPosting,
  resume: TalentProfile,
): JobApplication | null {
  const existing = getJobApplication(userId, job.id);
  if (existing) return existing;

  const application: JobApplication = {
    id: createJobApplicationId(),
    userId,
    jobId: job.id,
    resumeId: resume.id,
    jobTitle: job.title,
    companyName: job.companyName,
    resumeTitle: talentResumeTitle(resume),
    appliedAt: getKoreaDateTimeLocalMin(),
    status: 'applied',
  };

  const store = readStore();
  store[userId] = [application, ...(store[userId] ?? [])];
  writeStore(store);
  return application;
}

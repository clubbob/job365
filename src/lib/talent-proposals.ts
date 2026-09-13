import { digitsOnly } from '@/lib/business-number';
import { getKoreaDateTimeLocalMin } from '@/lib/datetime';
import { followedCompanyKey } from '@/lib/followed-companies';
import { getJobById } from '@/lib/job-catalog';
import { listPublishedMyJobPostings } from '@/lib/my-job-posts';
import { findMyTalentProfile, getMyTalentProfile, listMyTalentProfilesForUser } from '@/lib/my-talent-profile';
import { recruiterCompanyFromJobs } from '@/lib/resume-view-blocks';
import { missingProposeRequirements } from '@/lib/recruiter-ready';
import { getTalentById } from '@/lib/talent-catalog';
import { talentResumeTitle } from '@/lib/talent-display';
import type { JobPosting } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

export type TalentProposalStatus = 'none' | 'pending' | 'accepted' | 'rejected';

export const TALENT_PROPOSAL_STATUS_LABELS: Record<Exclude<TalentProposalStatus, 'none'>, string> = {
  pending: '제안 대기',
  accepted: '수락함',
  rejected: '거절함',
};

export type ReceivedProposalCompany = {
  key: string;
  recruiterId: string;
  companyName: string;
  businessNumber?: string;
  proposedAt: string;
  status: Exclude<TalentProposalStatus, 'none'>;
};

export type ReceivedProposal = {
  id: string;
  recruiterId: string;
  talentId: string;
  companyName: string;
  businessNumber?: string;
  resumeTitle: string;
  jobId?: string;
  jobTitle: string;
  proposedAt: string;
  status: Exclude<TalentProposalStatus, 'none'>;
  resumeMissing: boolean;
};

export type TalentProposalView = {
  status: TalentProposalStatus;
  jobId?: string;
  jobTitle: string;
};

type ProposalRecord = {
  status: Exclude<TalentProposalStatus, 'none'>;
  talentOwnerId?: string;
  companyName?: string;
  businessNumber?: string;
  proposedAt?: string;
  resumeTitle?: string;
  jobId?: string;
  jobTitle?: string;
  hiddenFromSenderList?: boolean;
};

const STORAGE_KEY = 'job365.talentProposals';
const STORE_RESET_AT = '20260913-clear-all-proposals';
const STORE_RESET_KEY = 'job365.talentProposals.resetAt';

type ProposalStore = Record<string, Record<string, ProposalRecord | Exclude<TalentProposalStatus, 'none'>>>;

function isStoredStatus(value: unknown): value is Exclude<TalentProposalStatus, 'none'> {
  return value === 'pending' || value === 'accepted' || value === 'rejected';
}

function asRecord(value: unknown): ProposalRecord | null {
  if (isStoredStatus(value)) return { status: value };
  if (!value || typeof value !== 'object') return null;
  const item = value as ProposalRecord;
  if (!isStoredStatus(item.status)) return null;
  return item;
}

function readStore(): ProposalStore {
  if (typeof window === 'undefined') return {};
  try {
    if (localStorage.getItem(STORE_RESET_KEY) !== STORE_RESET_AT) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORE_RESET_KEY, STORE_RESET_AT);
      return {};
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProposalStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProposalStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resolveProposalTalent(talentId: string): TalentProfile | undefined {
  return findMyTalentProfile(talentId)?.profile ?? getTalentById(talentId);
}

function companyForRecruiter(
  recruiterId: string,
  record: ProposalRecord,
): { companyName: string; businessNumber?: string } {
  const identity = recruiterCompanyFromJobs(recruiterId);
  const companyName = (record.companyName || identity?.companyName || '').trim();
  const businessNumber = digitsOnly(record.businessNumber ?? identity?.businessNumber ?? '') || undefined;
  return { companyName: companyName || '회사명 없음', businessNumber };
}

function linkedJob(record: ProposalRecord): { jobId?: string; jobTitle: string } {
  const storedTitle = record.jobTitle?.trim() ?? '';
  if (!record.jobId) return { jobTitle: storedTitle };
  const live = getJobById(record.jobId);
  return {
    jobId: record.jobId,
    jobTitle: live?.title?.trim() || storedTitle,
  };
}

export function resolveProposeJob(recruiterId: string, jobId?: string): JobPosting | null {
  const jobs = listPublishedMyJobPostings(recruiterId);
  if (jobs.length === 0) return null;
  if (jobId) return jobs.find((job) => job.id === jobId) ?? null;
  if (jobs.length === 1) return jobs[0] ?? null;
  return null;
}

export function getTalentProposalStatus(recruiterId: string, talentId: string): TalentProposalStatus {
  return getTalentProposalView(recruiterId, talentId).status;
}

export function getTalentProposalView(recruiterId: string, talentId: string): TalentProposalView {
  const record = asRecord(readStore()[recruiterId]?.[talentId]);
  if (!record) return { status: 'none', jobTitle: '' };
  const job = linkedJob(record);
  return { status: record.status, jobId: job.jobId, jobTitle: job.jobTitle };
}

export function saveTalentProposal(
  recruiterId: string,
  talentId: string,
  status: Exclude<TalentProposalStatus, 'none'>,
  jobId?: string,
): void {
  if (status === 'pending' && missingProposeRequirements(recruiterId).length > 0) return;
  const owned = findMyTalentProfile(talentId);
  if (status === 'pending' && owned?.userId === recruiterId) return;
  const talent = resolveProposalTalent(talentId);
  const identity = recruiterCompanyFromJobs(recruiterId);
  const current = asRecord(readStore()[recruiterId]?.[talentId]);
  const sendingAgain = status === 'pending' && current?.status === 'rejected';
  let nextJobId = current?.jobId;
  let nextJobTitle = current?.jobTitle;
  if (status === 'pending') {
    const job = resolveProposeJob(recruiterId, jobId);
    if (!job) return;
    nextJobId = job.id;
    nextJobTitle = job.title;
  }
  const record: ProposalRecord = {
    status,
    talentOwnerId: owned?.userId ?? current?.talentOwnerId,
    companyName: identity?.companyName ?? current?.companyName,
    businessNumber: digitsOnly(identity?.businessNumber ?? current?.businessNumber ?? '') || undefined,
    proposedAt: sendingAgain ? getKoreaDateTimeLocalMin() : current?.proposedAt ?? getKoreaDateTimeLocalMin(),
    resumeTitle: talent ? talentResumeTitle(talent) : current?.resumeTitle,
    jobId: nextJobId,
    jobTitle: nextJobTitle,
    hiddenFromSenderList: sendingAgain ? undefined : current?.hiddenFromSenderList,
  };
  const store = readStore();
  store[recruiterId] = { ...store[recruiterId], [talentId]: record };
  writeStore(store);
}

/** 구인자 보낸 면접 제안 목록에서만 숨긴다. 구직자가 받은 제안은 그대로 둔다. */
export function hideSentProposalFromList(recruiterId: string, talentId: string): boolean {
  const current = asRecord(readStore()[recruiterId]?.[talentId]);
  if (!current || current.hiddenFromSenderList) return false;
  const store = readStore();
  store[recruiterId] = {
    ...store[recruiterId],
    [talentId]: { ...current, hiddenFromSenderList: true },
  };
  writeStore(store);
  return true;
}

export function proposalDateLabel(proposedAt: string): string {
  return proposedAt.slice(0, 10) || '—';
}

export function listReceivedProposals(jobseekerId: string): ReceivedProposal[] {
  const talents = listMyTalentProfilesForUser(jobseekerId);
  const talentIds = new Set(talents.map((item) => item.id));
  if (talentIds.size === 0) return [];

  const items: ReceivedProposal[] = [];
  for (const [recruiterId, talentsById] of Object.entries(readStore())) {
    if (!talentsById || typeof talentsById !== 'object') continue;
    for (const [talentId, value] of Object.entries(talentsById)) {
      const record = asRecord(value);
      if (!record) continue;
      const owned = findMyTalentProfile(talentId);
      const ownerId = record.talentOwnerId ?? owned?.userId;
      if (ownerId !== jobseekerId && !talentIds.has(talentId)) continue;

      const company = companyForRecruiter(recruiterId, record);
      const resume = owned?.userId === jobseekerId ? owned.profile : getMyTalentProfile(jobseekerId, talentId);
      const job = linkedJob(record);
      items.push({
        id: `${recruiterId}:${talentId}`,
        recruiterId,
        talentId,
        companyName: company.companyName,
        businessNumber: company.businessNumber,
        resumeTitle: resume ? talentResumeTitle(resume) : record.resumeTitle?.trim() || '삭제된 이력서',
        jobId: job.jobId,
        jobTitle: job.jobTitle,
        proposedAt: record.proposedAt ?? '',
        status: record.status,
        resumeMissing: !resume,
      });
    }
  }

  return items.sort((a, b) => {
    const byTime = b.proposedAt.localeCompare(a.proposedAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

export function listSentProposals(recruiterId: string): ReceivedProposal[] {
  const talentsById = readStore()[recruiterId];
  if (!talentsById || typeof talentsById !== 'object') return [];

  const items: ReceivedProposal[] = [];
  for (const [talentId, value] of Object.entries(talentsById)) {
    const record = asRecord(value);
    if (!record || record.hiddenFromSenderList) continue;
    const resume = resolveProposalTalent(talentId);
    const company = companyForRecruiter(recruiterId, record);
    const job = linkedJob(record);
    items.push({
      id: `${recruiterId}:${talentId}`,
      recruiterId,
      talentId,
      companyName: company.companyName,
      businessNumber: company.businessNumber,
      resumeTitle: resume ? talentResumeTitle(resume) : record.resumeTitle?.trim() || '삭제된 이력서',
      jobId: job.jobId,
      jobTitle: job.jobTitle,
      proposedAt: record.proposedAt ?? '',
      status: record.status,
      resumeMissing: !resume,
    });
  }

  return items.sort((a, b) => {
    const byTime = b.proposedAt.localeCompare(a.proposedAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

export function listProposedCompaniesForJobseeker(jobseekerId: string): ReceivedProposalCompany[] {
  const byKey = new Map<string, ReceivedProposalCompany>();
  for (const proposal of listReceivedProposals(jobseekerId)) {
    const key = proposal.companyName
      ? followedCompanyKey(proposal.companyName, proposal.businessNumber)
      : `recruiter:${proposal.recruiterId}`;
    const existing = byKey.get(key);
    if (existing && existing.proposedAt.localeCompare(proposal.proposedAt) >= 0) continue;
    byKey.set(key, {
      key,
      recruiterId: proposal.recruiterId,
      companyName: proposal.companyName,
      businessNumber: proposal.businessNumber,
      proposedAt: proposal.proposedAt,
      status: proposal.status,
    });
  }
  return [...byKey.values()].sort((a, b) => b.proposedAt.localeCompare(a.proposedAt));
}

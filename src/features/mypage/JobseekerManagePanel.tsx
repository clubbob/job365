'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import JobCard from '@/features/jobs/JobCard';
import WorkPreferencesForm from '@/features/mypage/WorkPreferencesForm';
import ResumeViewLimitPanel from '@/features/mypage/ResumeViewLimitPanel';
import {
  JOB_APPLICATION_STATUS_LABELS,
  hideJobApplicationFromList,
  jobApplicationDateLabel,
  listMyJobApplications,
  type JobApplication,
  type JobApplicationStatus,
} from '@/lib/job-applications';
import {
  jobMatchesFollowedCompany,
  listFollowedCompanies,
  listFollowedCompanyJobs,
  unfollowCompany,
  type FollowedCompany,
} from '@/lib/followed-companies';
import { listResumeViewBlocks } from '@/lib/resume-view-blocks';
import { getJobById } from '@/lib/job-catalog';
import {
  listReceivedProposals,
  proposalDateLabel,
  saveTalentProposal,
  TALENT_PROPOSAL_STATUS_LABELS,
  type ReceivedProposal,
} from '@/lib/talent-proposals';
import {
  canPublishMyTalentProfile,
  deleteMyTalentProfileById,
  duplicateMyTalentProfile,
  listMyTalentProfilesForUser,
  missingPublishRequirements,
  publishMyTalentProfile,
  unpublishMyTalentProfile,
} from '@/lib/my-talent-profile';
import { syncDeleteTalentProfile, syncMyTalentProfile } from '@/lib/posting-sync';
import { talentCareerLabel, talentEducation, talentRecentDate, talentResumeTitle, talentWorkTypesLabel } from '@/lib/talent-display';
import { cn } from '@/lib/utils';
import { isWorkPreferencesComplete } from '@/lib/work-preferences';
import { WORK_TYPE_LABELS, type JobPosting } from '@/types/job';
import { isPublishedTalent, type TalentProfile } from '@/types/talent';

export const JOBSEEKER_SUB_TABS = [
  { id: 'conditions', label: '희망 근무 조건' },
  { id: 'resume', label: '이력서 관리' },
  { id: 'applications', label: '입사 지원 현황' },
  { id: 'proposals', label: '받은 면접 제안' },
  { id: 'companies', label: '관심 회사 채용 정보' },
  { id: 'privacy', label: '이력서 열람 제한' },
] as const;

export type JobseekerSubTab = (typeof JOBSEEKER_SUB_TABS)[number]['id'];

export function isJobseekerSubTab(value: string | null): value is JobseekerSubTab {
  return JOBSEEKER_SUB_TABS.some((item) => item.id === value);
}

const primaryLinkClassName =
  'inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover';
const rowActionClassName =
  'inline-flex rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45';
const publishActionClassName =
  'inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-muted disabled:hover:bg-neutral-200';
const disabledPrimaryClassName =
  'inline-flex cursor-not-allowed rounded-lg bg-neutral-200 px-4 py-2.5 text-sm font-semibold text-muted';
const dangerActionClassName =
  'inline-flex rounded-lg border border-danger/30 px-3 py-2 text-sm font-semibold text-danger hover:bg-red-50';

export default function JobseekerManagePanel({
  userId,
  resumes,
  ready,
  subTab,
  onSelectSubTab,
  onResumesChange,
}: {
  userId: string;
  resumes: TalentProfile[];
  ready: boolean;
  subTab: JobseekerSubTab;
  onSelectSubTab: (id: JobseekerSubTab) => void;
  onResumesChange: (resumes: TalentProfile[]) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appliedStatusByJobId, setAppliedStatusByJobId] = useState<Record<string, JobApplicationStatus>>({});
  const [followedCompanies, setFollowedCompanies] = useState<FollowedCompany[]>([]);
  const [followedJobs, setFollowedJobs] = useState<JobPosting[]>([]);
  const [blockedCompanyCount, setBlockedCompanyCount] = useState(0);
  const [proposals, setProposals] = useState<ReceivedProposal[]>([]);
  const conditionsReady = isWorkPreferencesComplete(userId);
  const completeResumeCount = resumes.filter((item) => canPublishMyTalentProfile(userId, item)).length;

  useEffect(() => {
    setBusyId(null);
  }, [resumes]);

  useEffect(() => {
    setApplications(listMyJobApplications(userId));
    setAppliedStatusByJobId(
      Object.fromEntries(
        listMyJobApplications(userId, { includeHidden: true }).map((item) => [item.jobId, item.status]),
      ),
    );
    setFollowedCompanies(listFollowedCompanies(userId));
    setFollowedJobs(listFollowedCompanyJobs(userId));
    setBlockedCompanyCount(listResumeViewBlocks(userId).length);
    setProposals(listReceivedProposals(userId));
  }, [userId, subTab]);

  function refresh() {
    onResumesChange(listMyTalentProfilesForUser(userId));
  }

  async function handleCopy(resume: TalentProfile) {
    setBusyId(resume.id);
    const copied = duplicateMyTalentProfile(userId, resume.id);
    if (copied) {
      await syncMyTalentProfile(copied);
      refresh();
    }
    setBusyId(null);
  }

  async function syncAll() {
    const next = listMyTalentProfilesForUser(userId);
    await Promise.all(next.map((item) => syncMyTalentProfile(item)));
    onResumesChange(next);
  }

  async function handlePublish(resume: TalentProfile) {
    if (!canPublishMyTalentProfile(userId, resume)) return;
    const currentPublished = resumes.find((item) => item.id !== resume.id && isPublishedTalent(item));
    if (currentPublished) {
      const nextTitle = talentResumeTitle(resume);
      const currentTitle = talentResumeTitle(currentPublished);
      if (!window.confirm(`공개는 이력서 1건만 할 수 있습니다. 「${nextTitle}」를 공개하면 「${currentTitle}」 공개는 해제됩니다.`)) {
        return;
      }
    }
    setBusyId(resume.id);
    if (publishMyTalentProfile(userId, resume.id)) await syncAll();
    setBusyId(null);
  }

  async function handleUnpublish(resume: TalentProfile) {
    const title = talentResumeTitle(resume);
    if (!window.confirm(`「${title}」 이력서 공개를 해제할까요?`)) return;
    setBusyId(resume.id);
    if (unpublishMyTalentProfile(userId, resume.id)) await syncAll();
    setBusyId(null);
  }

  async function handleDelete(resume: TalentProfile) {
    const title = talentResumeTitle(resume);
    if (!window.confirm(`「${title}」 이력서를 삭제할까요?`)) return;
    setBusyId(resume.id);
    deleteMyTalentProfileById(resume.id);
    await syncDeleteTalentProfile(resume.id);
    refresh();
    setBusyId(null);
  }

  function handleHideApplication(application: JobApplication) {
    if (
      !window.confirm(
        `「${application.jobTitle}」을 입사 지원 현황 목록에서 삭제할까요? 지원 자체는 취소되지 않습니다.`,
      )
    ) {
      return;
    }
    hideJobApplicationFromList(userId, application.id);
    setApplications(listMyJobApplications(userId));
    setAppliedStatusByJobId(
      Object.fromEntries(
        listMyJobApplications(userId, { includeHidden: true }).map((item) => [item.jobId, item.status]),
      ),
    );
  }

  function handleRespondProposal(proposal: ReceivedProposal, status: 'accepted' | 'rejected') {
    const action = status === 'accepted' ? '수락' : '거절';
    if (!window.confirm(`「${proposal.companyName}」의 면접 제안을 ${action}할까요?`)) return;
    saveTalentProposal(proposal.recruiterId, proposal.talentId, status);
    setProposals(listReceivedProposals(userId));
  }

  function handleUnfollowCompany(company: FollowedCompany) {
    if (!window.confirm(`「${company.companyName}」 관심 회사를 해제할까요?`)) return;
    unfollowCompany(userId, company.key);
    setFollowedCompanies(listFollowedCompanies(userId));
    setFollowedJobs(listFollowedCompanyJobs(userId));
  }

  return (
    <div className="space-y-4">
      <div
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
        role="tablist"
        aria-label="취업 관리"
      >
        {JOBSEEKER_SUB_TABS.map((item) => {
          const active = subTab === item.id;
          const badge =
            item.id === 'conditions' && conditionsReady
              ? '완료'
              : item.id === 'resume' && completeResumeCount > 0
                ? `${completeResumeCount}건`
                : item.id === 'applications' && applications.length > 0
                  ? `${applications.length}건`
                  : item.id === 'proposals' && proposals.length > 0
                    ? `${proposals.length}건`
                    : item.id === 'companies' && followedJobs.length > 0
                    ? `${followedJobs.length}건`
                    : item.id === 'privacy' && blockedCompanyCount > 0
                      ? `${blockedCompanyCount}곳`
                      : null;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={badge ? `${item.label}, ${badge}` : item.label}
              onClick={() => onSelectSubTab(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground',
              )}
            >
              {item.label}
              {badge ? (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {subTab === 'conditions' ? <WorkPreferencesForm userId={userId} onSaved={refresh} /> : null}

      {subTab === 'resume' ? (
        <Card
          title="이력서 관리"
          description={
            !conditionsReady
              ? '근무 형태, 지역, 직종, 근무 가능을 모두 저장해야 이력서를 등록하고 공개할 수 있습니다.'
              : ready && resumes.length > 0
                ? `${resumes.length}건이 등록되어 있습니다. 공개는 희망 근무 조건과 이력서가 완료된 1건만 할 수 있습니다.`
                : '지원 회사별로 내용을 나눠 등록하고, 복사해서 새 이력서를 만들 수 있습니다. 공개는 희망 근무 조건과 이력서가 완료된 1건만 할 수 있습니다.'
          }
          action={
            conditionsReady ? (
              <Link href="/talents/new?from=mypage" className={primaryLinkClassName}>
                이력서 등록
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className={disabledPrimaryClassName}
                title="희망 근무 조건을 먼저 저장해 주세요."
              >
                이력서 등록
              </button>
            )
          }
        >
          {!ready ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : (
            <div className="space-y-4">
              {!conditionsReady ? (
                <p className="text-sm text-muted">
                  이력서를 등록하거나 공개하려면{' '}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => onSelectSubTab('conditions')}
                  >
                    희망 근무 조건
                  </button>
                  을 먼저 저장해 주세요.
                </p>
              ) : null}
              {resumes.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:gap-3">
              {resumes.map((resume) => {
                const published = isPublishedTalent(resume);
                const title = talentResumeTitle(resume);
                const busy = busyId === resume.id;
                const workTypesLabel = talentWorkTypesLabel(resume);
                const missing = missingPublishRequirements(userId, resume);
                const canPublish = missing.length === 0;
                return (
                  <li
                    key={resume.id}
                    className="flex h-full flex-col rounded-xl border border-border bg-surface p-3 shadow-card sm:p-4"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {published ? (
                        <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                          공개
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
                          작성 중
                        </span>
                      )}
                      {workTypesLabel !== '미입력' ? (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                          {workTypesLabel}
                        </span>
                      ) : null}
                      {talentCareerLabel(resume) !== '미입력' ? (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                          {talentCareerLabel(resume)}
                        </span>
                      ) : null}
                      {talentEducation(resume) !== '미입력' ? (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                          {talentEducation(resume)}
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={
                        resume.title?.trim()
                          ? 'mt-2 line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base'
                          : 'mt-2 line-clamp-2 text-sm font-bold leading-snug text-subtle sm:text-base'
                      }
                    >
                      {title}
                    </p>
                    {resume.headline?.trim() && resume.headline.trim() !== title ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{resume.headline}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-subtle">최근 저장일 {talentRecentDate(resume)}</p>
                    {!published && missing.length > 0 ? (
                      <p className="mt-2 text-sm text-muted">
                        공개하려면 다음을 저장해 주세요. {missing.join(', ')}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      {published ? (
                        <button
                          type="button"
                          className={rowActionClassName}
                          disabled={busy}
                          onClick={() => void handleUnpublish(resume)}
                        >
                          공개 취소
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={publishActionClassName}
                          disabled={busy || !canPublish}
                          title={
                            canPublish
                              ? '이 이력서를 인재 정보에 공개합니다.'
                              : `공개하려면 다음을 저장해 주세요. ${missing.join(', ')}`
                          }
                          onClick={() => void handlePublish(resume)}
                        >
                          공개
                        </button>
                      )}
                      <Link
                        href={`/talents/new?edit=${encodeURIComponent(resume.id)}&from=mypage`}
                        className={rowActionClassName}
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        className={rowActionClassName}
                        disabled={busy}
                        onClick={() => void handleCopy(resume)}
                      >
                        복사
                      </button>
                      {published ? (
                        <Link href={`/talents/${resume.id}`} className={rowActionClassName}>
                          보기
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className={dangerActionClassName}
                        disabled={busy}
                        onClick={() => void handleDelete(resume)}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
              ) : conditionsReady ? (
                <p className="text-sm text-muted">아직 등록한 이력서가 없습니다.</p>
              ) : null}
            </div>
          )}
        </Card>
      ) : null}

      {subTab === 'applications' ? (
        <Card
          title="입사 지원 현황"
          description={
            applications.length > 0
              ? `${applications.length}건을 지원했습니다.`
              : '지원한 채용 정보가 없습니다. 지원하면 진행 상태가 여기에 표시됩니다.'
          }
        >
          {applications.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:gap-3">
              {applications.map((application) => {
                const job = getJobById(application.jobId);
                const workType = job ? WORK_TYPE_LABELS[job.workType] : null;
                const followed = followedCompanies.some((company) =>
                  job
                    ? jobMatchesFollowedCompany(job, company)
                    : company.companyName.trim() === application.companyName.trim(),
                );
                return (
                  <li
                    key={application.id}
                    className="flex h-full flex-col rounded-xl border border-border bg-surface p-3 shadow-card sm:p-4"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {application.status !== 'applied' ? (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            application.status === 'passed'
                              ? 'bg-primary text-white'
                              : 'bg-neutral-100 text-muted',
                          )}
                        >
                          {JOB_APPLICATION_STATUS_LABELS[application.status]}
                        </span>
                      ) : null}
                      {followed ? (
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/30">
                          관심 회사 등록함
                        </span>
                      ) : null}
                      {workType ? (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                          {workType}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
                      {application.jobTitle}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-muted">{application.companyName}</p>
                    <p className="mt-1 text-xs text-subtle">
                      지원일 {jobApplicationDateLabel(application.appliedAt)}
                      {application.resumeTitle ? ` · ${application.resumeTitle}` : ''}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      <Link href={`/jobs/${encodeURIComponent(application.jobId)}`} className={rowActionClassName}>
                        보기
                      </Link>
                      <button
                        type="button"
                        className={dangerActionClassName}
                        onClick={() => handleHideApplication(application)}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">채용 정보에서 지원하면 이 목록에 나타납니다.</p>
          )}
        </Card>
      ) : null}

      {subTab === 'proposals' ? (
        <Card
          title="받은 면접 제안"
          description={
            proposals.length > 0
              ? `${proposals.length}건의 면접 제안이 있습니다. 수락하면 그 구인자에게만 실명이 공개됩니다.`
              : '구인자가 인재 정보에서 제안하면 여기에서 확인하고 수락하거나 거절할 수 있습니다.'
          }
        >
          {proposals.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:gap-3">
              {proposals.map((proposal) => (
                <li
                  key={proposal.id}
                  className="flex h-full flex-col rounded-xl border border-border bg-surface p-3 shadow-card sm:p-4"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        proposal.status === 'accepted'
                          ? 'bg-primary text-white'
                          : proposal.status === 'rejected'
                            ? 'bg-neutral-100 text-muted'
                            : 'bg-primary/10 text-primary',
                      )}
                    >
                      {TALENT_PROPOSAL_STATUS_LABELS[proposal.status]}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
                    {proposal.companyName}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-muted">{proposal.resumeTitle}</p>
                  <p className="mt-1 text-xs text-subtle">제안일 {proposalDateLabel(proposal.proposedAt)}</p>
                  {proposal.status === 'pending' ? (
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      <button
                        type="button"
                        className={publishActionClassName}
                        onClick={() => handleRespondProposal(proposal, 'accepted')}
                      >
                        수락
                      </button>
                      <button
                        type="button"
                        className={dangerActionClassName}
                        onClick={() => handleRespondProposal(proposal, 'rejected')}
                      >
                        거절
                      </button>
                    </div>
                  ) : (
                    <p className="mt-auto pt-3 text-sm text-muted">
                      {proposal.status === 'accepted'
                        ? '이 구인자에게만 실명이 공개됩니다.'
                        : '거절한 제안입니다.'}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">받은 면접 제안이 없습니다. 이력서를 공개하면 구인자가 제안할 수 있습니다.</p>
          )}
        </Card>
      ) : null}

      {subTab === 'privacy' ? (
        <ResumeViewLimitPanel
          userId={userId}
          resumes={resumes}
          onChange={() => setBlockedCompanyCount(listResumeViewBlocks(userId).length)}
        />
      ) : null}

      {subTab === 'companies' ? (
        <Card
          title="관심 회사 채용 정보"
          description={
            followedJobs.length > 0
              ? `${followedCompanies.length}개 회사 · ${followedJobs.length}건`
              : followedCompanies.length > 0
                ? '관심 회사는 있으나 등록된 채용 정보가 없습니다.'
                : '관심 회사의 채용 정보가 없습니다. 채용 정보에서 관심 회사로 저장하면 여기에 모입니다.'
          }
        >
          {followedCompanies.length > 0 ? (
            <div className="space-y-4">
              <ul className="flex flex-wrap gap-2">
                {followedCompanies.map((company) => (
                  <li
                    key={company.key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-neutral-50 py-1 pl-3 pr-1.5 text-sm font-medium text-foreground"
                  >
                    {company.companyName}
                    <button
                      type="button"
                      className="rounded-full px-2 py-0.5 text-xs font-semibold text-muted hover:bg-white hover:text-foreground"
                      onClick={() => handleUnfollowCompany(company)}
                    >
                      해제
                    </button>
                  </li>
                ))}
              </ul>
              {followedJobs.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {followedJobs.map((job) => {
                    const appliedStatus = appliedStatusByJobId[job.id];
                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        badge={
                          appliedStatus
                            ? appliedStatus === 'applied'
                              ? '입사 지원함'
                              : JOB_APPLICATION_STATUS_LABELS[appliedStatus]
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">해당 회사가 채용 정보를 등록하면 이 목록에 나타납니다.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">채용 정보 상세에서 관심 회사로 저장하면 그 회사의 채용 정보가 여기에 모입니다.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}

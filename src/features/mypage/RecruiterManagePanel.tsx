'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  JOB_APPLICATION_STATUS_LABELS,
  hideJobApplicationFromRecruiterList,
  jobApplicationDateLabel,
  listApplicationsForJobs,
  updateJobApplicationStatus,
  type JobApplication,
  type JobApplicationStatus,
} from '@/lib/job-applications';
import { jobCareerLabel, jobEducationLabel } from '@/lib/job-display';
import { findMyTalentProfile } from '@/lib/my-talent-profile';
import {
  canPublishMyJobPosting,
  deleteMyJobPosting,
  duplicateMyJobPosting,
  listMyJobPostings,
  missingJobPublishRequirements,
  publishMyJobPosting,
  unpublishMyJobPosting,
} from '@/lib/my-job-posts';
import { syncDeleteJobPosting, syncMyJobPosting } from '@/lib/posting-sync';
import {
  hideSentProposalFromList,
  listSentProposals,
  proposalDateLabel,
  resolveProposalTalent,
  TALENT_PROPOSAL_STATUS_LABELS,
  type ReceivedProposal,
} from '@/lib/talent-proposals';
import { getJobById } from '@/lib/job-catalog';
import { displayTalentName } from '@/lib/talent-display';
import { cn } from '@/lib/utils';
import { jobWorkTypesLabel, isPublishedJob, type JobPosting } from '@/types/job';
import { isPublishedTalent } from '@/types/talent';

export const RECRUITER_SUB_TABS = [
  { id: 'jobs', label: '채용 정보 관리' },
  { id: 'proposals', label: '보낸 면접 제안' },
  { id: 'applications', label: '받은 입사 지원' },
] as const;

export type RecruiterSubTab = (typeof RECRUITER_SUB_TABS)[number]['id'];

export function isRecruiterSubTab(value: string | null): value is RecruiterSubTab {
  return RECRUITER_SUB_TABS.some((item) => item.id === value);
}

const primaryLinkClassName =
  'inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover';
const rowActionClassName =
  'inline-flex rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border-strong disabled:hover:bg-surface';
const compactActionClassName =
  'inline-flex shrink-0 whitespace-nowrap rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border-strong disabled:hover:bg-surface';
const publishActionClassName =
  'inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-muted disabled:hover:bg-neutral-200';
const compactPublishClassName =
  'inline-flex shrink-0 whitespace-nowrap rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-muted disabled:hover:bg-neutral-200';
const dangerActionClassName =
  'inline-flex rounded-lg border border-danger/30 px-3 py-2 text-sm font-semibold text-danger transition-colors hover:border-danger hover:bg-red-50';
const compactDangerClassName =
  'inline-flex shrink-0 whitespace-nowrap rounded-lg border border-danger/30 px-2 py-1.5 text-xs font-semibold text-danger transition-colors hover:border-danger hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-danger/30 disabled:hover:bg-transparent';

export default function RecruiterManagePanel({
  userId,
  jobs,
  ready,
  subTab,
  onSelectSubTab,
  onJobsChange,
}: {
  userId: string;
  jobs: JobPosting[];
  ready: boolean;
  subTab: RecruiterSubTab;
  onSelectSubTab: (id: RecruiterSubTab) => void;
  onJobsChange: (jobs: JobPosting[]) => void;
}) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [proposals, setProposals] = useState<ReceivedProposal[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setBusyId(null);
  }, [jobs]);

  useEffect(() => {
    setApplications(listApplicationsForJobs(jobs.map((job) => job.id)));
    setProposals(listSentProposals(userId));
  }, [jobs, subTab, userId]);

  function handleApplicationStatus(application: JobApplication, status: Exclude<JobApplicationStatus, 'applied'>) {
    const label = JOB_APPLICATION_STATUS_LABELS[status];
    if (!window.confirm(`「${application.jobTitle}」 지원을 ${label}으로 처리할까요?`)) return;
    updateJobApplicationStatus(application.id, status);
    setApplications(listApplicationsForJobs(jobs.map((job) => job.id)));
  }

  function handleHideApplication(application: JobApplication) {
    if (
      !window.confirm(
        `「${application.jobTitle}」 지원을 받은 입사 지원 목록에서 삭제할까요? 구직자의 입사 지원 현황은 그대로 둡니다.`,
      )
    ) {
      return;
    }
    hideJobApplicationFromRecruiterList(application.id);
    setApplications(listApplicationsForJobs(jobs.map((job) => job.id)));
  }

  function handleHideProposal(proposal: ReceivedProposal, name: string) {
    if (
      !window.confirm(
        `「${name}」 제안을 보낸 면접 제안 목록에서 삭제할까요? 구직자가 받은 면접 제안은 그대로 둡니다.`,
      )
    ) {
      return;
    }
    hideSentProposalFromList(userId, proposal.talentId);
    setProposals(listSentProposals(userId));
  }

  function refreshJobs() {
    onJobsChange(listMyJobPostings(userId));
  }

  async function syncAllJobs() {
    const next = listMyJobPostings(userId);
    await Promise.all(next.map((item) => syncMyJobPosting(item)));
    onJobsChange(next);
  }

  async function handleCopyJob(job: JobPosting) {
    setBusyId(job.id);
    const copied = duplicateMyJobPosting(userId, job.id);
    if (copied) {
      await syncMyJobPosting(copied);
      refreshJobs();
    }
    setBusyId(null);
  }

  async function handlePublishJob(job: JobPosting) {
    if (!canPublishMyJobPosting(userId, job)) return;
    setBusyId(job.id);
    if (publishMyJobPosting(userId, job.id)) await syncAllJobs();
    setBusyId(null);
  }

  async function handleUnpublishJob(job: JobPosting) {
    if (!window.confirm(`「${job.title}」 채용 정보 공개를 해제할까요?`)) return;
    setBusyId(job.id);
    if (unpublishMyJobPosting(userId, job.id)) await syncAllJobs();
    setBusyId(null);
  }

  async function handleSaveJobFile(job: JobPosting) {
    setBusyId(job.id);
    try {
      const { downloadJobFile } = await import('@/lib/job-file');
      await downloadJobFile(job, userId);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteJob(job: JobPosting) {
    if (!window.confirm(`「${job.title}」 채용 정보를 삭제할까요?`)) return;
    setBusyId(job.id);
    deleteMyJobPosting(userId, job.id);
    await syncDeleteJobPosting(job.id);
    refreshJobs();
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
        role="tablist"
        aria-label="채용 관리"
      >
        {RECRUITER_SUB_TABS.map((item) => {
          const active = subTab === item.id;
          const badge =
            item.id === 'jobs' && jobs.length > 0
              ? `${jobs.length}건`
              : item.id === 'proposals' && proposals.length > 0
                ? `${proposals.length}건`
                : item.id === 'applications' && applications.length > 0
                  ? `${applications.length}건`
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

      {subTab === 'jobs' ? (
        <Card
          title="채용 정보 관리"
          description={
            ready && jobs.length > 0
              ? `${jobs.length}건이 등록되어 있습니다.`
              : '구직자에게 노출할 채용 정보를 등록합니다.'
          }
          action={
            <Link href="/jobs/new?from=mypage" className={primaryLinkClassName}>
              채용 정보 등록
            </Link>
          }
        >
          {!ready ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : jobs.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:gap-3">
              {jobs.map((job) => {
                const workTypesLabel = jobWorkTypesLabel(job);
                const career = jobCareerLabel(job);
                const education = jobEducationLabel(job.education);
                const busy = busyId === job.id;
                const published = isPublishedJob(job);
                const missing = missingJobPublishRequirements(userId, job);
                const canPublish = missing.length === 0;
                return (
                  <li
                    key={job.id}
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
                      {workTypesLabel ? (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                          {workTypesLabel}
                        </span>
                      ) : null}
                      {career ? (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                          {career}
                        </span>
                      ) : null}
                      {education ? (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                          {education}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
                      {job.title}
                    </p>
                    {job.location.trim() ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{job.location}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-subtle">최근 저장일 {job.createdAt}</p>
                    {!published && missing.length > 0 ? (
                      <p className="mt-2 text-sm text-muted">
                        공개하려면 다음을 저장해 주세요. {missing.join(', ')}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-nowrap items-center gap-1 overflow-x-auto pt-3">
                      {published ? (
                        <button
                          type="button"
                          className={compactActionClassName}
                          disabled={busy}
                          onClick={() => void handleUnpublishJob(job)}
                        >
                          공개 취소
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={compactPublishClassName}
                          disabled={busy || !canPublish}
                          title={
                            canPublish
                              ? '이 채용 정보를 채용 정보 목록에 공개합니다.'
                              : `공개하려면 다음을 저장해 주세요. ${missing.join(', ')}`
                          }
                          onClick={() => void handlePublishJob(job)}
                        >
                          공개
                        </button>
                      )}
                      <Link
                        href={`/jobs/new?edit=${encodeURIComponent(job.id)}&from=mypage`}
                        className={compactActionClassName}
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        className={compactActionClassName}
                        disabled={busy}
                        onClick={() => void handleCopyJob(job)}
                      >
                        복사
                      </button>
                      <button
                        type="button"
                        className={compactActionClassName}
                        disabled={busy}
                        onClick={() => void handleSaveJobFile(job)}
                      >
                        채용 정보 출력
                      </button>
                      <button
                        type="button"
                        className={compactDangerClassName}
                        disabled={busy}
                        onClick={() => void handleDeleteJob(job)}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">아직 등록한 채용 정보가 없습니다.</p>
          )}
        </Card>
      ) : null}

      {subTab === 'applications' ? (
        <Card
          title="받은 입사 지원"
          description={
            applications.length > 0
              ? `${applications.length}건의 입사 지원을 받았습니다.`
              : '등록한 채용 정보에 입사 지원이 들어오면 여기에서 확인하고 합격·불합격을 처리할 수 있습니다.'
          }
        >
          {applications.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:gap-3">
              {applications.map((application) => {
                const resume = findMyTalentProfile(application.resumeId)?.profile;
                const published = resume ? isPublishedTalent(resume) : false;
                const applicantName = resume?.name?.trim()
                  ? displayTalentName(resume.name, true)
                  : application.resumeTitle || '지원자';
                return (
                  <li
                    key={application.id}
                    className="flex h-full flex-col rounded-xl border border-border bg-surface p-3 shadow-card sm:p-4"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          application.status === 'passed'
                            ? 'bg-primary text-white'
                            : application.status === 'rejected'
                              ? 'bg-neutral-100 text-muted'
                              : 'bg-primary/10 text-primary',
                        )}
                      >
                        {JOB_APPLICATION_STATUS_LABELS[application.status]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
                      {application.jobTitle}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-muted">{applicantName}</p>
                    <p className="mt-1 text-xs text-subtle">
                      지원일 {jobApplicationDateLabel(application.appliedAt)}
                      {application.resumeTitle ? ` · ${application.resumeTitle}` : ''}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      <Link href={`/jobs/${encodeURIComponent(application.jobId)}`} className={rowActionClassName}>
                        채용 정보
                      </Link>
                      {published ? (
                        <Link href={`/talents/${encodeURIComponent(application.resumeId)}`} className={rowActionClassName}>
                          이력서
                        </Link>
                      ) : null}
                      {application.status === 'applied' ? (
                        <>
                          <button
                            type="button"
                            className={publishActionClassName}
                            onClick={() => handleApplicationStatus(application, 'passed')}
                          >
                            합격
                          </button>
                          <button
                            type="button"
                            className={dangerActionClassName}
                            onClick={() => handleApplicationStatus(application, 'rejected')}
                          >
                            불합격
                          </button>
                        </>
                      ) : null}
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
            <p className="text-sm text-muted">받은 입사 지원이 없습니다. 채용 정보를 등록하면 입사 지원이 여기에 모입니다.</p>
          )}
        </Card>
      ) : null}

      {subTab === 'proposals' ? (
        <Card
          title="보낸 면접 제안"
          description={
            proposals.length > 0
              ? `${proposals.length}건을 제안했습니다. 구직자가 수락하면 실명이 이 계정에만 공개됩니다.`
              : '인재 정보에서 제안하면 진행 상태가 여기에 표시됩니다.'
          }
        >
          {proposals.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:gap-3">
              {proposals.map((proposal) => {
                const talent = resolveProposalTalent(proposal.talentId);
                const name = talent?.name?.trim()
                  ? displayTalentName(talent.name, proposal.status === 'accepted')
                  : proposal.resumeTitle;
                return (
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
                      {name}
                    </p>
                    {proposal.jobTitle ? (
                      <p className="mt-1 truncate text-sm font-medium text-muted">{proposal.jobTitle}</p>
                    ) : null}
                    {proposal.resumeMissing ? (
                      <p className="mt-1 text-sm text-muted">이력서가 삭제되었거나 더 이상 공개되지 않습니다.</p>
                    ) : proposal.resumeTitle && proposal.resumeTitle !== name ? (
                      <p className="mt-1 truncate text-sm font-medium text-muted">{proposal.resumeTitle}</p>
                    ) : null}
                    {proposal.proposedAt ? (
                      <p className="mt-1 text-xs text-subtle">제안일 {proposalDateLabel(proposal.proposedAt)}</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      {proposal.jobId && getJobById(proposal.jobId) ? (
                        <Link href={`/jobs/${encodeURIComponent(proposal.jobId)}`} className={rowActionClassName}>
                          채용 정보
                        </Link>
                      ) : null}
                      {proposal.resumeMissing ? null : (
                        <Link href={`/talents/${encodeURIComponent(proposal.talentId)}`} className={rowActionClassName}>
                          이력서
                        </Link>
                      )}
                      <button
                        type="button"
                        className={dangerActionClassName}
                        onClick={() => handleHideProposal(proposal, name)}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">보낸 면접 제안이 없습니다. 인재 정보에서 제안하면 이 목록에 나타납니다.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}

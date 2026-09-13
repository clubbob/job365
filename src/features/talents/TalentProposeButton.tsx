'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FieldLabel } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { authInputClassName } from '@/lib/auth-ui';
import { firstRequiredError } from '@/lib/form-required';
import { listPublishedMyJobPostings } from '@/lib/my-job-posts';
import { findMyTalentProfile } from '@/lib/my-talent-profile';
import { missingProposeRequirements, type ProposeRequirement } from '@/lib/recruiter-ready';
import {
  getTalentProposalView,
  saveTalentProposal,
  type TalentProposalStatus,
} from '@/lib/talent-proposals';
import { cn } from '@/lib/utils';
import { buttonBaseClassName, buttonPrimaryClassName, buttonSizeDefaultClassName } from '@/lib/button-ui';
import type { JobPosting } from '@/types/job';

export default function TalentProposeButton({
  talentId,
  onStatusChange,
}: {
  talentId: string;
  onStatusChange: (status: TalentProposalStatus) => void;
}) {
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const pathname = usePathname();
  const [status, setStatus] = useState<TalentProposalStatus>('none');
  const [linkedJobTitle, setLinkedJobTitle] = useState('');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<ProposeRequirement[]>([]);
  const loginHref = `/login?next=${encodeURIComponent(pathname || `/talents/${talentId}`)}`;

  useEffect(() => {
    if (!user) {
      setStatus('none');
      setLinkedJobTitle('');
      setJobs([]);
      setSelectedJobId('');
      setError('');
      setMissing([]);
      onStatusChange('none');
      return;
    }
    const next = getTalentProposalView(user.uid, talentId);
    setStatus(next.status);
    setLinkedJobTitle(next.jobTitle);
    onStatusChange(next.status);
    setMissing(mode === 'recruiter' ? missingProposeRequirements(user.uid) : []);
    setJobs(mode === 'recruiter' ? listPublishedMyJobPostings(user.uid) : []);
    setSelectedJobId('');
    setError('');
  }, [mode, onStatusChange, talentId, user]);

  if (loading) {
    return (
      <p className="text-center text-sm text-muted">불러오는 중…</p>
    );
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">실명은 구인자의 제안에 구직자가 수락하면, 그 구인자에게만 공개됩니다.</p>
        <Link
          href={loginHref}
          className={cn(buttonBaseClassName, buttonSizeDefaultClassName, buttonPrimaryClassName, 'w-full')}
        >
          로그인하고 면접 제안하기
        </Link>
      </div>
    );
  }

  if (mode !== 'recruiter') {
    return (
      <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
        제안은 구인자로 이용할 때 보낼 수 있습니다. 실명은 제안에 수락한 구인자에게만 공개됩니다.
      </p>
    );
  }

  if (findMyTalentProfile(talentId)?.userId === user.uid) {
    return (
      <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
        내가 등록한 이력서에는 면접 제안할 수 없습니다.
      </p>
    );
  }

  if (status === 'accepted') {
    return (
      <p className="rounded-lg bg-primary/5 px-4 py-3 text-sm text-foreground">
        {linkedJobTitle
          ? `구직자가 「${linkedJobTitle}」 제안을 수락했습니다. 이 계정에만 실명이 공개됩니다.`
          : '구직자가 제안을 수락했습니다. 이 계정에만 실명이 공개됩니다.'}
      </p>
    );
  }

  if (status === 'pending') {
    return (
      <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
        {linkedJobTitle
          ? `「${linkedJobTitle}」에 대한 제안을 전달했습니다. 구직자가 이 제안을 수락하면 실명이 이 계정에만 보입니다.`
          : '제안을 전달했습니다. 구직자가 이 제안을 수락하면 실명이 이 계정에만 보입니다.'}
      </p>
    );
  }

  const blocked = missing.length > 0;
  const onlyJob = jobs.length === 1 ? jobs[0] : null;
  const gate = blocked ? (
    <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
      {missing.length > 1
        ? '회사 정보와 채용 정보를 모두 등록해야 제안할 수 있습니다.'
        : missing[0] === '회사 정보'
          ? '회사 정보를 등록해야 제안할 수 있습니다.'
          : '채용 정보를 등록해야 제안할 수 있습니다.'}{' '}
      {missing.includes('회사 정보') ? (
        <Link href="/mypage?tab=jobs" className="font-semibold text-primary hover:underline">
          회사 정보
        </Link>
      ) : null}
      {missing.length > 1 ? ' · ' : null}
      {missing.includes('채용 정보') ? (
        <Link href="/mypage?tab=jobs&sub=jobs" className="font-semibold text-primary hover:underline">
          채용 정보 관리
        </Link>
      ) : null}
    </p>
  ) : null;

  const recruiterId = user.uid;

  function handlePropose() {
    const nextMissing = missingProposeRequirements(recruiterId);
    if (nextMissing.length > 0) {
      setMissing(nextMissing);
      return;
    }
    const job = onlyJob ?? jobs.find((item) => item.id === selectedJobId);
    const requiredError = firstRequiredError([
      { ok: Boolean(job), message: '연결할 채용 정보를 선택하세요.' },
    ]);
    if (requiredError || !job) {
      setError(requiredError ?? '연결할 채용 정보를 선택하세요.');
      return;
    }
    if (!window.confirm(`「${job.title}」으로 면접을 제안할까요?`)) return;
    saveTalentProposal(recruiterId, talentId, 'pending', job.id);
    const next = getTalentProposalView(recruiterId, talentId);
    if (next.status !== 'pending') {
      setError('연결할 채용 정보를 선택하세요.');
      return;
    }
    setError('');
    setStatus('pending');
    setLinkedJobTitle(next.jobTitle);
    onStatusChange('pending');
  }

  const jobPicker =
    !blocked && jobs.length > 1 ? (
      <div>
        <FieldLabel htmlFor="propose-job" required>
          채용 정보
        </FieldLabel>
        <select
          id="propose-job"
          value={selectedJobId}
          onChange={(event) => {
            setSelectedJobId(event.target.value);
            setError('');
          }}
          className={cn(authInputClassName, !selectedJobId && 'font-normal text-subtle')}
        >
          <option value="">선택</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      </div>
    ) : null;

  const intro = blocked
    ? null
    : onlyJob
      ? `「${onlyJob.title}」 채용 정보로 면접을 제안합니다. 구직자가 이 제안을 수락하면 실명이 공개됩니다.`
      : '어느 채용 정보로 제안할지 고른 뒤 보내 주세요. 구직자가 이 제안을 수락하면 실명이 공개됩니다.';

  if (status === 'rejected') {
    return (
      <div className="space-y-2">
        <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
          {linkedJobTitle
            ? `구직자가 「${linkedJobTitle}」 제안을 거절했습니다.`
            : '구직자가 이 제안을 거절했습니다.'}
        </p>
        {gate}
        {intro ? <p className="text-sm text-muted">{intro}</p> : null}
        {jobPicker}
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <button
          type="button"
          className={cn(buttonBaseClassName, buttonSizeDefaultClassName, buttonPrimaryClassName, 'w-full')}
          disabled={blocked}
          onClick={handlePropose}
        >
          다시 면접 제안하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {gate}
      {intro ? <p className="text-sm text-muted">{intro}</p> : null}
      {jobPicker}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <button
        type="button"
        className={cn(buttonBaseClassName, buttonSizeDefaultClassName, buttonPrimaryClassName, 'w-full')}
        disabled={blocked}
        onClick={handlePropose}
      >
        면접 제안하기
      </button>
    </div>
  );
}

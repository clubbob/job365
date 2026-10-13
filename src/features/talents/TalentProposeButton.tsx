'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { firstRequiredError } from '@/lib/form-required';
import { missingProposeRequirements, type ProposeRequirement } from '@/lib/recruiter-ready';
import { recruiterCompanyFromJobs } from '@/lib/resume-view-blocks';
import {
  getTalentProposalView,
  saveTalentProposal,
  type TalentProposalStatus,
} from '@/lib/talent-proposals';
import { cn } from '@/lib/utils';
import { buttonBaseClassName, buttonPrimaryClassName, buttonSizeDefaultClassName } from '@/lib/button-ui';

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
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<ProposeRequirement[]>([]);
  const loginHref = `/login?next=${encodeURIComponent(pathname || `/talents/${talentId}`)}`;

  useEffect(() => {
    if (!user) {
      setStatus('none');
      setLinkedJobTitle('');
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
    setError('');
  }, [mode, onStatusChange, talentId, user]);

  if (loading) {
    return <p className="text-center text-sm text-muted">불러오는 중…</p>;
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
  const gate = blocked ? (
    <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
      회사 정보를 등록해야 제안할 수 있습니다.{' '}
      <Link href="/mypage?tab=account" className="font-semibold text-primary hover:underline">
        회원 정보
      </Link>
      에서 사업자 인증을 완료해 주세요.
    </p>
  ) : null;

  const recruiterId = user.uid;
  const companyLabel = recruiterCompanyFromJobs(recruiterId)?.companyName ?? '우리 회사';

  function handlePropose() {
    const nextMissing = missingProposeRequirements(recruiterId);
    if (nextMissing.length > 0) {
      setMissing(nextMissing);
      return;
    }
    const requiredError = firstRequiredError([
      { ok: Boolean(companyLabel.trim()), message: '회사 정보를 등록해 주세요.' },
    ]);
    if (requiredError) {
      setError(requiredError);
      return;
    }
    if (!window.confirm(`「${companyLabel}」에서 면접을 제안할까요?`)) return;
    saveTalentProposal(recruiterId, talentId, 'pending', companyLabel);
    const next = getTalentProposalView(recruiterId, talentId);
    if (next.status !== 'pending') {
      setError('제안을 보내지 못했습니다. 회사 정보를 확인해 주세요.');
      return;
    }
    setError('');
    setStatus('pending');
    setLinkedJobTitle(next.jobTitle);
    onStatusChange('pending');
  }

  const intro = blocked
    ? null
    : `「${companyLabel}」에서 면접을 제안합니다. 구직자가 수락하면 실명이 이 계정에만 공개됩니다.`;

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
        {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}
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
      {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}
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

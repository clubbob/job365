'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import {
  getTalentProposalStatus,
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
  const loginHref = `/login?next=${encodeURIComponent(pathname || `/talents/${talentId}`)}`;

  useEffect(() => {
    if (!user) {
      setStatus('none');
      onStatusChange('none');
      return;
    }
    const next = getTalentProposalStatus(user.uid, talentId);
    setStatus(next);
    onStatusChange(next);
  }, [onStatusChange, talentId, user]);

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
          로그인하고 제안하기
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
        구직자가 제안을 수락했습니다. 이 계정에만 실명이 공개됩니다.
      </p>
    );
  }

  if (status === 'pending') {
    return (
      <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
        제안을 전달했습니다. 구직자가 이 제안을 수락하면 실명이 이 계정에만 보입니다.
      </p>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="space-y-2">
        <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">구직자가 이 제안을 거절했습니다.</p>
        <button
          type="button"
          className={cn(buttonBaseClassName, buttonSizeDefaultClassName, buttonPrimaryClassName, 'w-full')}
          onClick={() => {
            saveTalentProposal(user.uid, talentId, 'pending');
            setStatus('pending');
            onStatusChange('pending');
          }}
        >
          다시 제안하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">제안하면 면접·채용 의사를 전달합니다. 구직자가 이 제안을 수락하면 실명이 공개됩니다.</p>
      <button
        type="button"
        className={cn(buttonBaseClassName, buttonSizeDefaultClassName, buttonPrimaryClassName, 'w-full')}
        onClick={() => {
          saveTalentProposal(user.uid, talentId, 'pending');
          setStatus('pending');
          onStatusChange('pending');
        }}
      >
        제안하기
      </button>
    </div>
  );
}

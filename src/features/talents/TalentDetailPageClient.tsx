'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import TalentProposeButton from '@/features/talents/TalentProposeButton';
import TalentResumeArticle from '@/features/talents/TalentResumeArticle';
import { isTalentHiddenFromViewer } from '@/lib/resume-view-blocks';
import { getTalentById } from '@/lib/talent-catalog';
import { talentResumeTitle } from '@/lib/talent-display';
import type { TalentProposalStatus } from '@/lib/talent-proposals';
import type { TalentProfile } from '@/types/talent';

export default function TalentDetailPageClient({ talentId }: { talentId: string }) {
  const searchParams = useSearchParams();
  const fromMypage = searchParams.get('from') === 'mypage';
  const listHref = fromMypage ? '/mypage?tab=resume&sub=resume' : '/talents';
  const listLabel = fromMypage ? '돌아가기' : '이전 목록으로';
  const { user, loading } = useAuth();
  const { mode, ready: modeReady } = useUserMode();
  const [proposalStatus, setProposalStatus] = useState<TalentProposalStatus>('none');
  const [talent, setTalent] = useState<TalentProfile | null | undefined>(undefined);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (loading || !modeReady) return;
    const found = getTalentById(talentId);
    if (!found) {
      setBlocked(false);
      setTalent(null);
      return;
    }
    if (mode === 'recruiter' && user && isTalentHiddenFromViewer(talentId, user.uid)) {
      setBlocked(true);
      setTalent(null);
      return;
    }
    setBlocked(false);
    setTalent(found);
  }, [loading, mode, modeReady, talentId, user]);

  if (talent === undefined || loading || !modeReady) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!talent) {
    return (
      <div className="space-y-5">
        <PageHeader title="인재 정보" homeHref={listHref} homeLabel={listLabel} />
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-muted">
            {blocked ? '이 이력서는 열람이 제한되어 있습니다.' : '인재 정보를 찾을 수 없습니다.'}
          </p>
          <Link href={listHref} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            {listLabel}
          </Link>
        </div>
      </div>
    );
  }

  const revealName = proposalStatus === 'accepted';

  return (
    <div className="space-y-5">
      <PageHeader
        title="인재 정보"
        description={talentResumeTitle(talent)}
        homeHref={listHref}
        homeLabel={listLabel}
      />
      <AdSlot placement="header" />

      <article className="space-y-4">
        <TalentResumeArticle talent={talent} revealName={revealName} />
        <div className="rounded-xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
          <TalentProposeButton talentId={talent.id} onStatusChange={setProposalStatus} />
        </div>
      </article>

      <AdSlot placement="detail" />
    </div>
  );
}

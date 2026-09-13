'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import {
  DetailBadge,
  DetailHero,
  DetailSection,
  DetailStatGrid,
  DetailTags,
  DetailText,
} from '@/components/ui/PostingDetail';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import TalentProposeButton from '@/features/talents/TalentProposeButton';
import { isTalentHiddenFromViewer } from '@/lib/resume-view-blocks';
import { getTalentById } from '@/lib/talent-catalog';
import { displayTalentName, talentBasicInfoItems, talentCareerLabel, talentEducation, talentResumeTitle, talentWorkTypesLabel } from '@/lib/talent-display';
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
  const workType = talentWorkTypesLabel(talent);
  const displayName = displayTalentName(talent.name, revealName);

  return (
    <div className="space-y-5">
      <PageHeader title="인재 정보" description={talent.headline} homeHref={listHref} homeLabel={listLabel} />
      <AdSlot placement="header" />

      <article className="space-y-4">
        <DetailHero
          eyebrow={displayName}
          title={talent.headline}
          photoUrl={talent.photoUrl}
          photoAlt={displayName}
          badges={
            <>
              <DetailBadge tone="primary">{workType}</DetailBadge>
              <DetailBadge>{talentCareerLabel(talent)}</DetailBadge>
              <DetailBadge>{talentEducation(talent)}</DetailBadge>
            </>
          }
          facts={[
            { label: '지역', value: talent.location || '—' },
            { label: '근무 가능', value: talent.available || '—' },
            { label: '경력 유무', value: talentCareerLabel(talent) },
          ]}
        />

        <DetailStatGrid
          items={[
            ...talentBasicInfoItems(talent, revealName),
            { label: '근무 형태', value: workType },
            { label: '경력 유무', value: talentCareerLabel(talent) },
            { label: '최종 학력', value: talentEducation(talent) },
            { label: '지역', value: talent.location },
            { label: '근무 가능', value: talent.available },
            { label: '학교', value: talent.school },
            { label: '전공', value: talent.major },
          ]}
        />

        <DetailSection title="자기 소개">
          <DetailText value={talent.summary} />
        </DetailSection>
        <DetailSection title="경력 내역">
          <DetailText value={talent.careerHistory} />
        </DetailSection>
        <DetailSection title="자격증">
          <DetailText value={talent.experience} />
        </DetailSection>
        <DetailSection title="어학">
          <DetailText value={talent.languages} />
        </DetailSection>
        <DetailSection title="스킬">
          <DetailTags items={talent.tags} />
        </DetailSection>

        <div className="rounded-xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
          <TalentProposeButton talentId={talent.id} onStatusChange={setProposalStatus} />
        </div>
      </article>

      <AdSlot placement="detail" />
    </div>
  );
}

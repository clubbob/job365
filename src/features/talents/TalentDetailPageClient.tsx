'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
import TalentProposeButton from '@/features/talents/TalentProposeButton';
import { getTalentById } from '@/lib/talent-catalog';
import { displayTalentName, talentBasicInfoItems, talentEducation, talentWorkTypeLabel } from '@/lib/talent-display';
import type { TalentProposalStatus } from '@/lib/talent-proposals';
import type { TalentProfile } from '@/types/talent';

export default function TalentDetailPageClient({ talentId }: { talentId: string }) {
  const [proposalStatus, setProposalStatus] = useState<TalentProposalStatus>('none');
  const [talent, setTalent] = useState<TalentProfile | null | undefined>(undefined);

  useEffect(() => {
    setTalent(getTalentById(talentId) ?? null);
  }, [talentId]);

  if (talent === undefined) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!talent) {
    return (
      <div className="space-y-5">
        <PageHeader title="인재 정보" homeHref="/talents" homeLabel="이전 목록으로" />
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-muted">인재 정보를 찾을 수 없습니다.</p>
          <Link href="/talents" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            이전 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const revealName = proposalStatus === 'accepted';
  const workType = talentWorkTypeLabel(talent.workType);
  const displayName = displayTalentName(talent.name, revealName);

  return (
    <div className="space-y-5">
      <PageHeader title="인재 정보" description={talent.headline} homeHref="/talents" homeLabel="이전 목록으로" />
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
              <DetailBadge>{talent.careerLabel}</DetailBadge>
              <DetailBadge>{talentEducation(talent)}</DetailBadge>
            </>
          }
          highlightLabel={talent.desiredPay ? '희망 급여' : undefined}
          highlightValue={talent.desiredPay || undefined}
          facts={[
            { label: '희망 근무지', value: talent.location || '—' },
            { label: '가능 시기', value: talent.available || '—' },
            { label: '경력', value: talent.careerLabel },
          ]}
        />

        <DetailStatGrid
          items={[
            ...talentBasicInfoItems(talent, revealName),
            { label: '희망 근무 형태', value: workType },
            { label: '경력', value: talent.careerLabel },
            { label: '학력', value: talentEducation(talent) },
            { label: '희망 근무지', value: talent.location },
            { label: '가능 시기', value: talent.available },
            { label: '학교', value: talent.school },
            { label: '전공', value: talent.major },
          ]}
        />

        <DetailSection title="자기 소개">
          <DetailText value={talent.summary} />
        </DetailSection>
        <DetailSection title="경력 사항">
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
        <DetailSection title="포트폴리오">
          {talent.portfolioUrl ? (
            <a
              href={talent.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full break-all rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
            >
              {talent.portfolioUrl}
            </a>
          ) : (
            <p className="text-subtle">—</p>
          )}
        </DetailSection>

        <div className="rounded-xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
          <TalentProposeButton talentId={talent.id} onStatusChange={setProposalStatus} />
        </div>
      </article>

      <AdSlot placement="detail" />
    </div>
  );
}

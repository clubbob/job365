'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import TalentProposeButton from '@/features/talents/TalentProposeButton';
import { getTalentById } from '@/lib/talent-catalog';
import { displayTalentName, talentEducation, talentRecentDate } from '@/lib/talent-display';
import type { TalentProposalStatus } from '@/lib/talent-proposals';
import { WORK_TYPE_LABELS } from '@/types/job';

export default function TalentDetailPageClient({ talentId }: { talentId: string }) {
  const [proposalStatus, setProposalStatus] = useState<TalentProposalStatus>('none');
  const talent = getTalentById(talentId);
  const revealName = proposalStatus === 'accepted';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${displayTalentName(talent.name, revealName)} · ${talent.headline}`}
        description={`${talent.careerLabel} · ${talentEducation(talent)}`}
        homeHref="/talents"
        homeLabel="이전 목록으로"
      />
      <AdSlot placement="header" />
      <article className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {WORK_TYPE_LABELS[talent.workType]}
          </span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
            {talent.available}
          </span>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtle">희망 급여</dt>
            <dd className="mt-0.5 font-semibold text-primary">{talent.desiredPay}</dd>
          </div>
          <div>
            <dt className="text-subtle">희망 근무지</dt>
            <dd className="mt-0.5 font-medium text-foreground">{talent.location}</dd>
          </div>
          <div>
            <dt className="text-subtle">경력</dt>
            <dd className="mt-0.5 font-medium text-foreground">{talent.careerLabel}</dd>
          </div>
          <div>
            <dt className="text-subtle">학력</dt>
            <dd className="mt-0.5 font-medium text-foreground">{talentEducation(talent)}</dd>
          </div>
          <div>
            <dt className="text-subtle">프로필 최근일</dt>
            <dd className="mt-0.5 font-medium text-foreground">{talentRecentDate(talent)}</dd>
          </div>
        </dl>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">{talent.summary}</p>
        <div className="mt-5">
          <h2 className="text-sm font-semibold text-foreground">경력 요약</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{talent.experience}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {talent.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-muted">
              {tag}
            </span>
          ))}
        </div>
        <TalentProposeButton talentId={talent.id} onStatusChange={setProposalStatus} />
      </article>
      <AdSlot placement="detail" />
    </div>
  );
}

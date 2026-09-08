'use client';

import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import TalentList from '@/features/talents/TalentList';

export default function TalentsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="인재 정보"
        description="파트타임부터 정규직까지, 이용료 없이 인재 정보를 찾아보세요."
      />

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        인재 실명은 목록에 보이지 않습니다. 구인자가 보낸 제안에 구직자가 수락하면, 그 구인자에게만 실명이 공개됩니다.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
        <p className="text-sm text-muted">
          프로필을 올려도 실명은 가려집니다. 제안에 수락한 구인자에게만 실명이 공개됩니다.
        </p>
        <Link
          href="/mypage"
          className="inline-flex rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          내 프로필
        </Link>
      </div>

      <AdSlot placement="header" />
      <TalentList pageSize={10} />
    </div>
  );
}

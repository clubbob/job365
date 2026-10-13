'use client';

import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import CategoryNav from '@/features/jobs/CategoryNav';
import TalentList from '@/features/talents/TalentList';
import { LIST_PAGE_SIZE } from '@/lib/list-page';
import { WORK_TYPE_LABELS, type JobWorkType } from '@/types/job';

export default function CategoryPageClient({ workType }: { workType: JobWorkType }) {
  const label = WORK_TYPE_LABELS[workType];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${label}`}
        description={`${label} 채용 공고와 이력서 정보를 확인하세요.`}
        homeHref="/"
        homeLabel="홈으로"
      />

      <CategoryNav current={workType} />
      <AdSlot placement="header" />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">채용 공고</h2>
          <Link href="/jobs" className="text-sm font-semibold text-primary hover:underline">
            전체 보기
          </Link>
        </div>
        <p className="text-sm text-muted">
          채용 공고는 수집된 목록에서 확인합니다.{' '}
          <Link href="/jobs" className="font-semibold text-primary hover:underline">
            채용 공고 페이지
          </Link>
          로 이동해 주세요.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">이력서 정보</h2>
          <Link href="/talents" className="text-sm font-semibold text-primary hover:underline">
            전체 보기
          </Link>
        </div>
        <TalentList
          workType={workType}
          pageSize={LIST_PAGE_SIZE}
          persistKey={`category-talents-${workType}`}
          hideFilters
          showSearch={false}
          showInfeed={false}
        />
      </section>
    </div>
  );
}

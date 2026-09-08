'use client';

import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import CategoryNav from '@/features/jobs/CategoryNav';
import JobList from '@/features/jobs/JobList';
import TalentList from '@/features/talents/TalentList';
import { LIST_PAGE_SIZE } from '@/lib/list-page';
import { WORK_TYPE_LABELS, type JobWorkType } from '@/types/job';

export default function CategoryPageClient({ workType }: { workType: JobWorkType }) {
  const label = WORK_TYPE_LABELS[workType];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${label}`}
        description={`${label} 채용 정보와 이력서 정보를 확인하세요.`}
        homeHref="/"
        homeLabel="홈으로"
      />

      <CategoryNav current={workType} />
      <AdSlot placement="header" />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">채용 정보</h2>
          <Link href="/jobs" className="text-sm font-semibold text-primary hover:underline">
            전체 보기
          </Link>
        </div>
        <JobList
          workType={workType}
          pageSize={LIST_PAGE_SIZE}
          persistKey={`category-jobs-${workType}`}
          hideFilters
          showCount
          showInfeed={false}
        />
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

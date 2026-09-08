'use client';

import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import JobList from '@/features/jobs/JobList';

export default function JobsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="채용 정보"
        description="파트타임부터 정규직까지, 이용료 없이 채용 정보를 찾아보세요."
      />

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        채용 정보는 목록에서 바로 확인할 수 있습니다. 지원하면 해당 구인자에게만 지원 내용이 전달됩니다.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
        <p className="text-sm text-muted">인재를 찾고 있다면 채용 정보를 올려 보세요. 등록 이용료는 없습니다.</p>
        <Link
          href="/jobs/new"
          className="inline-flex rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          채용 정보 등록
        </Link>
      </div>

      <AdSlot placement="header" />
      <JobList showSearch showCount pageSize={10} persistKey="jobs" />
    </div>
  );
}

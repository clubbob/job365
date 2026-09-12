'use client';

import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import JobList from '@/features/jobs/JobList';
import { LIST_PAGE_SIZE } from '@/lib/list-page';

export default function JobsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="채용 정보"
        description="알바부터 정규직까지, 이용료 없이 채용 정보를 찾아보세요."
      />

      <AdSlot placement="header" />
      <JobList showSearch showCount pageSize={LIST_PAGE_SIZE} persistKey="jobs" />
    </div>
  );
}

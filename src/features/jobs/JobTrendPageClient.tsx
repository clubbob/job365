'use client';

import PageHeader from '@/components/navigation/PageHeader';
import AdSlot from '@/components/ads/AdSlot';
import JobBoardTrendPanel from '@/features/job-board/JobBoardTrendPanel';
import { JOB_TREND_PAGE_DESCRIPTION, JOB_TREND_PAGE_TITLE } from '@/lib/site-menu-copy';

export default function JobTrendPageClient() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={JOB_TREND_PAGE_TITLE} description={JOB_TREND_PAGE_DESCRIPTION} />
      <AdSlot placement="header" />
      <JobBoardTrendPanel />
    </div>
  );
}

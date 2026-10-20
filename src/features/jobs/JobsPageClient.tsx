'use client';

import PageHeader from '@/components/navigation/PageHeader';
import JobBoardList from '@/features/job-board/JobBoardList';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';
import { JOBS_PAGE_DESCRIPTION } from '@/lib/site-menu-copy';

export default function JobsPageClient() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="채용 공고" description={JOBS_PAGE_DESCRIPTION} />
      <JobBoardList
        showNewSection
        hideNewSectionHeader
        persistKey="jobs"
        pageSize={JOB_LIST_PAGE_SIZE}
      />
    </div>
  );
}

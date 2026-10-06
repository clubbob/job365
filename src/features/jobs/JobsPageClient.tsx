'use client';

import JobBoardList from '@/features/job-board/JobBoardList';
import { JOBS_PAGE_DESCRIPTION } from '@/lib/site-menu-copy';

export default function JobsPageClient() {
  return (
    <JobBoardList
      title="채용 공고"
      description={JOBS_PAGE_DESCRIPTION}
      showNewSection
      hideNewSectionHeader
    />
  );
}

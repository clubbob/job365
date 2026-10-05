'use client';

import JobBoardList from '@/features/job-board/JobBoardList';

export default function JobsPageClient() {
  return (
    <JobBoardList
      title="채용 공고"
      description="대기업·중견·채용 사이트에서 수집한 최신 채용 공고를 한곳에서 확인하세요."
      showNewSection
    />
  );
}

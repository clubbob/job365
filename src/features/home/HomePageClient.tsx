'use client';

import HomeScreenBanner from '@/components/ads/HomeScreenBanner';
import JobBoardList from '@/features/job-board/JobBoardList';
import { JOB_HOME_PAGE_SIZE } from '@/lib/job-board/constants';

export default function HomePageClient() {
  return (
    <div className="flex flex-col gap-5">
      <HomeScreenBanner />
      <JobBoardList
        title="채용 공고"
        description="대기업·중견·채용 사이트에서 수집한 최신 채용 공고를 한곳에서 확인하세요."
        showNewSection
        pageSize={JOB_HOME_PAGE_SIZE}
      />
    </div>
  );
}

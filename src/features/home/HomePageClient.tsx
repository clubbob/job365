'use client';

import HomeScreenBanner from '@/components/ads/HomeScreenBanner';
import JobBoardList from '@/features/job-board/JobBoardList';
import { JOB_HOME_PAGE_SIZE } from '@/lib/job-board/constants';

export default function HomePageClient() {
  return (
    <div className="flex flex-col gap-5">
      <HomeScreenBanner />
      <JobBoardList
        showFilters={false}
        listTitle="최근 채용 공고"
        listMoreHref="/jobs"
        showCount={false}
        showLoadMore={false}
        pageSize={JOB_HOME_PAGE_SIZE}
      />
    </div>
  );
}

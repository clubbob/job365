'use client';

import HomeScreenBanner from '@/components/ads/HomeScreenBanner';
import HomeServiceHighlights from '@/features/home/HomeServiceHighlights';
import JobBoardList from '@/features/job-board/JobBoardList';
import { JOB_HOME_PAGE_SIZE } from '@/lib/job-board/constants';
import type { CrawledJobListItem } from '@/types/crawled-job';

type HomePageClientProps = {
  prefetchedRecentJobs?: CrawledJobListItem[];
};

export default function HomePageClient({ prefetchedRecentJobs }: HomePageClientProps) {
  return (
    <div className="flex flex-col gap-6">
      <HomeScreenBanner />
      <HomeServiceHighlights />
      <JobBoardList
        showFilters={false}
        listTitle="최근 채용 공고"
        listMoreHref="/jobs"
        showCount={false}
        showLoadMore={false}
        pageSize={JOB_HOME_PAGE_SIZE}
        prefetchedItems={prefetchedRecentJobs}
      />
    </div>
  );
}

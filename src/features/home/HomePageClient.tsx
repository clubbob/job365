'use client';

import HomeScreenBanner from '@/components/ads/HomeScreenBanner';
import HomeJobCoverage, { type HomeJobCoverageStats } from '@/features/home/HomeJobCoverage';
import HomeServiceHighlights from '@/features/home/HomeServiceHighlights';
import RecruiterHome from '@/features/home/RecruiterHome';
import JobBoardList from '@/features/job-board/JobBoardList';
import { useUserMode } from '@/features/mode/mode-context';
import { JOB_HOME_PAGE_SIZE } from '@/lib/job-board/constants';
import type { CrawledJobListItem } from '@/types/crawled-job';

type HomePageClientProps = {
  prefetchedRecentJobs?: CrawledJobListItem[];
  jobCoverage?: HomeJobCoverageStats;
};

export default function HomePageClient({ prefetchedRecentJobs, jobCoverage }: HomePageClientProps) {
  const { mode, ready } = useUserMode();

  if (ready && mode === 'recruiter') {
    return <RecruiterHome />;
  }

  return (
    <div className="flex flex-col gap-6">
      <HomeScreenBanner />
      <HomeJobCoverage stats={jobCoverage} />
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

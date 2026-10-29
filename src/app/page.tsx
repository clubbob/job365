import HomePageClient from '@/features/home/HomePageClient';
import {
  countBrowsableJobsByPrimaryCompanySegment,
  listActiveCrawledJobsPage,
} from '@/lib/crawled-jobs-server';
import { emptyCompanySegmentCounts } from '@/lib/job-board/company-segment';
import { JOB_HOME_PAGE_SIZE } from '@/lib/job-board/constants';
import type { HomeJobCoverageStats } from '@/features/home/HomeJobCoverage';

export default async function HomePage() {
  let prefetchedRecentJobs: Awaited<ReturnType<typeof listActiveCrawledJobsPage>>['items'] = [];
  let jobCoverage: HomeJobCoverageStats = { total: 0, bySegment: emptyCompanySegmentCounts() };
  try {
    const { items, total } = await listActiveCrawledJobsPage(1, JOB_HOME_PAGE_SIZE);
    const bySegment = await countBrowsableJobsByPrimaryCompanySegment();
    prefetchedRecentJobs = items;
    jobCoverage = { total, bySegment };
  } catch (error) {
    console.error('[home] recent jobs prefetch failed', error);
  }

  return <HomePageClient prefetchedRecentJobs={prefetchedRecentJobs} jobCoverage={jobCoverage} />;
}

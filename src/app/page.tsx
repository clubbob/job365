import HomePageClient from '@/features/home/HomePageClient';
import { listActiveCrawledJobsPage } from '@/lib/crawled-jobs-server';
import { JOB_HOME_PAGE_SIZE } from '@/lib/job-board/constants';

export default async function HomePage() {
  let prefetchedRecentJobs: Awaited<ReturnType<typeof listActiveCrawledJobsPage>>['items'] = [];
  try {
    const { items } = await listActiveCrawledJobsPage(1, JOB_HOME_PAGE_SIZE);
    prefetchedRecentJobs = items;
  } catch (error) {
    console.error('[home] recent jobs prefetch failed', error);
  }

  return <HomePageClient prefetchedRecentJobs={prefetchedRecentJobs} />;
}

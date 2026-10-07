import type { Metadata } from 'next';
import MyJobsPageClient from '@/features/my-jobs/MyJobsPageClient';
import { MATCHED_JOBS_PAGE_DESCRIPTION, MATCHED_JOBS_PAGE_TITLE } from '@/lib/site-menu-copy';

export const metadata: Metadata = {
  title: MATCHED_JOBS_PAGE_TITLE,
  description: MATCHED_JOBS_PAGE_DESCRIPTION,
};

export default function MyJobsPage() {
  return <MyJobsPageClient />;
}

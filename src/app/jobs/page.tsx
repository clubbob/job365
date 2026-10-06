import type { Metadata } from 'next';
import JobsPageClient from '@/features/jobs/JobsPageClient';
import { JOBS_PAGE_DESCRIPTION } from '@/lib/site-menu-copy';

export const metadata: Metadata = {
  title: '채용 공고',
  description: JOBS_PAGE_DESCRIPTION,
};

export default function JobsPage() {
  return <JobsPageClient />;
}

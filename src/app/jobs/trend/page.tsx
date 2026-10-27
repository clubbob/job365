import type { Metadata } from 'next';
import JobTrendPageClient from '@/features/jobs/JobTrendPageClient';
import { JOB_TREND_PAGE_DESCRIPTION, JOB_TREND_PAGE_TITLE } from '@/lib/site-menu-copy';

export const metadata: Metadata = {
  title: JOB_TREND_PAGE_TITLE,
  description: JOB_TREND_PAGE_DESCRIPTION,
};

export default function JobTrendPage() {
  return <JobTrendPageClient />;
}

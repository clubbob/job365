import type { Metadata } from 'next';
import JobCompaniesPageClient from '@/features/jobs/JobCompaniesPageClient';
import { COMPANIES_PAGE_DESCRIPTION } from '@/lib/site-menu-copy';

export const metadata: Metadata = {
  title: '채용 공고 회사',
  description: COMPANIES_PAGE_DESCRIPTION,
};

export const dynamic = 'force-static';

export default function JobCompaniesPage() {
  return <JobCompaniesPageClient />;
}

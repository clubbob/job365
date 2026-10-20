import type { Metadata } from 'next';
import { Suspense } from 'react';
import MyJobsPageClient from '@/features/my-jobs/MyJobsPageClient';
import { MATCHED_JOBS_PAGE_DESCRIPTION, MATCHED_JOBS_PAGE_TITLE } from '@/lib/site-menu-copy';

export const metadata: Metadata = {
  title: MATCHED_JOBS_PAGE_TITLE,
  description: MATCHED_JOBS_PAGE_DESCRIPTION,
};

export default function MyJobsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">불러오는 중…</p>}>
      <MyJobsPageClient />
    </Suspense>
  );
}

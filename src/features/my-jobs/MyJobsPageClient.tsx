'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import JobBoardList from '@/features/job-board/JobBoardList';
import { useAuth } from '@/features/auth/auth-context';
import {
  MATCHED_JOBS_PAGE_DESCRIPTION,
  MATCHED_JOBS_PAGE_TITLE,
  MATCHED_JOBS_SETTINGS_TITLE,
} from '@/lib/site-menu-copy';

export default function MyJobsPageClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?next=/my-jobs');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{MATCHED_JOBS_PAGE_TITLE}</h1>
          <p className="text-sm text-muted">{MATCHED_JOBS_PAGE_DESCRIPTION}</p>
        </div>
        <Link
          href="/mypage?tab=alerts"
          className="inline-flex shrink-0 rounded-lg border border-primary bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
        >
          {MATCHED_JOBS_SETTINGS_TITLE} 변경
        </Link>
      </header>
      <JobBoardList mode="matched" showFilters={false} />
    </div>
  );
}

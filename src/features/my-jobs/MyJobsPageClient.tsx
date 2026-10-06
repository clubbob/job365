'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import JobBoardList from '@/features/job-board/JobBoardList';
import { useAuth } from '@/features/auth/auth-context';
import { MY_JOBS_PAGE_DESCRIPTION } from '@/lib/site-menu-copy';

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
    <div className="flex flex-col gap-4">
      <JobBoardList
        mode="matched"
        title="내 채용 공고"
        description={MY_JOBS_PAGE_DESCRIPTION}
        showFilters={false}
      />
      <p className="text-center text-sm text-muted">
        조건을 바꾸려면{' '}
        <Link href="/mypage?tab=alerts" className="font-semibold text-primary hover:underline">
          마이페이지 수신 설정
        </Link>
        을 확인해 주세요.
      </p>
    </div>
  );
}

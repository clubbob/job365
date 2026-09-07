'use client';

import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import JobList from '@/features/jobs/JobList';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';

export default function JobsPageClient() {
  const { user } = useAuth();
  const { mode } = useUserMode();
  const canPost = Boolean(user) && mode === 'recruiter';

  return (
    <div className="space-y-6">
      <PageHeader
        title="채용 정보"
        description="정규직부터 프로젝트까지, 이용료 없이 채용 공고를 찾아보세요."
      />

      {canPost ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
          <p className="text-sm text-muted">인재를 찾고 있다면 공고를 올려 보세요. 등록 이용료는 없습니다.</p>
          <Link
            href="/jobs/new"
            className="inline-flex rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            공고 등록
          </Link>
        </div>
      ) : null}

      <AdSlot placement="header" />
      <JobList showSearch showCount pageSize={10} persistKey="jobs" />
    </div>
  );
}

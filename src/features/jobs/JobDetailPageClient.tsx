'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import JobDetailActions from '@/features/jobs/JobDetailActions';
import JobPostingArticle from '@/features/jobs/JobPostingArticle';
import { getJobById } from '@/lib/job-catalog';
import type { JobPosting } from '@/types/job';

export default function JobDetailPageClient({ jobId }: { jobId: string }) {
  const searchParams = useSearchParams();
  const fromMypage = searchParams.get('from') === 'mypage';
  const listHref = fromMypage ? '/mypage?tab=jobs&sub=jobs' : '/jobs';
  const listLabel = fromMypage ? '돌아가기' : '이전 목록으로';
  const [job, setJob] = useState<JobPosting | null | undefined>(undefined);

  useEffect(() => {
    setJob(getJobById(jobId) ?? null);
  }, [jobId]);

  if (job === undefined) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!job) {
    return (
      <div className="space-y-5">
        <PageHeader title="채용 정보" homeHref={listHref} homeLabel={listLabel} />
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-muted">채용 정보를 찾을 수 없습니다.</p>
          <Link href={listHref} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            {listLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="채용 정보" description={job.companyName} homeHref={listHref} homeLabel={listLabel} />
      <AdSlot placement="header" />

      <article className="space-y-4">
        <JobPostingArticle job={job} />
        <JobDetailActions key={job.id} job={job} />
      </article>

      <AdSlot placement="detail" />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { FormFeedback } from '@/components/ui/FormFeedback';
import CrawledJobDetailView from '@/features/job-board/CrawledJobDetailView';
import {
  adminDangerActionClassName,
  adminSecondaryActionClassName,
} from '@/lib/admin-ui';
import { getCrawledJobOriginalUrl } from '@/lib/crawler/source-url';
import { cn } from '@/lib/utils';
import type { CrawledJob } from '@/types/crawled-job';

export default function AdminCrawledJobDetailClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<CrawledJob | null>(null);
  const [displayHidden, setDisplayHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crawled-jobs/${encodeURIComponent(jobId)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { job: CrawledJob; displayHidden: boolean };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data?.job) {
        throw new Error(json.error?.message ?? '공고를 불러오지 못했습니다.');
      }
      setJob(json.data.job);
      setDisplayHidden(json.data.displayHidden);
    } catch (err) {
      setError(err instanceof Error ? err.message : '공고를 불러오지 못했습니다.');
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleClose() {
    if (!job || job.status === 'closed') return;
    if (!window.confirm(`「${job.title}」 공고를 마감 처리할까요? 사이트 목록에서 숨겨집니다.`)) return;

    setPending(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crawled-jobs/${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message ?? '마감 처리하지 못했습니다.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '마감 처리하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (error && !job) {
    return (
      <FormFeedback variant="error" centered>{error}</FormFeedback>
    );
  }

  if (!job) {
    return (
      <FormFeedback variant="error" centered>공고를 찾지 못했습니다.</FormFeedback>
    );
  }

  const todayDate = job.crawledAt.slice(0, 10);
  const originalJobUrl = getCrawledJobOriginalUrl(job.applyUrl);
  const canViewOnSite = job.status === 'active' && !displayHidden;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="수집 채용 공고"
        description="사용자에게 보이는 화면과 동일한 미리보기입니다."
        homeHref="/admin/jobs/crawled"
        homeLabel="목록으로"
        showRefresh={false}
      />

      {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            job.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-muted',
          )}
        >
          {job.status === 'active' ? '모집 중' : '마감'}
        </span>
        {displayHidden ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">노출 중단</span>
        ) : null}
        {canViewOnSite ? (
          <Link href={`/jobs/${encodeURIComponent(job.id)}`} className={adminSecondaryActionClassName}>
            사용자 화면
          </Link>
        ) : null}
        {job.status === 'active' ? (
          <button
            type="button"
            disabled={pending}
            className={adminDangerActionClassName}
            onClick={() => void handleClose()}
          >
            마감
          </button>
        ) : null}
      </div>

      {job.status === 'closed' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          이 공고는 마감되었습니다.
        </div>
      ) : null}

      <CrawledJobDetailView
        job={job}
        todayDate={todayDate}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={originalJobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
            >
              지원하기
            </a>
          </div>
        }
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { DetailBadge } from '@/components/ui/PostingDetail';
import JobPostingArticle from '@/features/jobs/JobPostingArticle';
import {
  adminDangerActionClassName,
  adminJson,
  adminPrimaryActionClassName,
  adminSecondaryActionClassName,
} from '@/lib/admin-ui';
import { deleteMyJobPostingById, findMyJobPosting, saveMyJobPosting } from '@/lib/my-job-posts';
import { isPublishedJob, type JobPosting } from '@/types/job';
import AdminPublishBadge from '@/features/admin/AdminPublishBadge';

type ItemResponse =
  | { ok: true; data: { item: { ownerId: string; job: JobPosting } | null } }
  | { ok: false; error?: { message?: string } };

export default function AdminJobDetailClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [item, setItem] = useState<{ ownerId: string; job: JobPosting } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = findMyJobPosting(jobId);
      try {
        const data = await adminJson<ItemResponse>(`/api/admin/jobs/${encodeURIComponent(jobId)}`);
        if (!cancelled && data.ok && data.data.item) {
          setItem(data.data.item);
          saveMyJobPosting(data.data.item.ownerId, data.data.item.job);
          setReady(true);
          return;
        }
      } catch {
        // 로컬 저장 건으로 이어갑니다.
      }
      if (!cancelled) {
        setItem(local ? { ownerId: local.userId, job: local.job } : null);
        setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`「${item.job.title}」 채용 정보를 삭제할까요?`)) return;
    deleteMyJobPostingById(item.job.id);
    try {
      await adminJson(`/api/admin/jobs/${encodeURIComponent(item.job.id)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    router.push('/admin/jobs');
  }

  if (!ready) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-5">
        <PageHeader title="채용 정보" homeHref="/admin/jobs" homeLabel="목록으로" />
        <Card>
          <p className="text-sm text-muted">채용 정보를 찾을 수 없습니다.</p>
        </Card>
      </div>
    );
  }

  const { job } = item;

  return (
    <div className="space-y-5">
      <PageHeader title="채용 정보" description={job.companyName} homeHref="/admin/jobs" homeLabel="목록으로" />
      <div className="flex flex-wrap items-center gap-2">
        <AdminPublishBadge published={isPublishedJob(job)} />
        {isPublishedJob(job) ? (
          <Link href={`/jobs/${job.id}`} className={adminSecondaryActionClassName}>
            사이트에서 보기
          </Link>
        ) : null}
        <Link href={`/admin/jobs/${encodeURIComponent(job.id)}/edit`} className={adminPrimaryActionClassName}>
          수정
        </Link>
        <button type="button" className={adminDangerActionClassName} onClick={() => void handleDelete()}>
          삭제
        </button>
      </div>
      <article className="space-y-4">
        <JobPostingArticle
          job={job}
          ownerId={item.ownerId}
          extraBadges={<DetailBadge tone="primary">{isPublishedJob(job) ? '공개' : '작성 중'}</DetailBadge>}
        />
      </article>
    </div>
  );
}

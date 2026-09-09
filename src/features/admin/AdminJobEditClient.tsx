'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import JobCreateForm from '@/features/jobs/JobCreateForm';
import { adminJson } from '@/lib/admin-ui';
import { findMyJobPosting, saveMyJobPosting } from '@/lib/my-job-posts';
import type { JobPosting } from '@/types/job';

type ItemResponse =
  | { ok: true; data: { item: { ownerId: string; job: JobPosting } | null } }
  | { ok: false; error?: { message?: string } };

export default function AdminJobEditClient({ jobId }: { jobId: string }) {
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

  if (!ready) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-5">
        <PageHeader title="채용 정보 수정" homeHref="/admin/jobs" homeLabel="목록으로" />
        <Card>
          <p className="text-sm text-muted">채용 정보를 찾을 수 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="채용 정보 수정" description={item.job.companyName} homeHref="/admin/jobs" homeLabel="목록으로" />
      <JobCreateForm
        userId={item.ownerId}
        companyName={item.job.companyName}
        businessNumber={item.job.businessNumber ?? ''}
        initialJob={item.job}
        companyEditable
        returnPath={`/admin/jobs/${encodeURIComponent(item.job.id)}`}
        onSave={async (job) => {
          saveMyJobPosting(item.ownerId, job);
          const res = await adminJson<{ ok?: boolean; error?: { code?: string; message?: string } }>(
            `/api/admin/jobs/${encodeURIComponent(item.job.id)}`,
            { method: 'PUT', body: JSON.stringify(job) },
          );
          if (res.ok === false && res.error?.code !== 'ADMIN_NOT_CONFIGURED') {
            throw new Error(res.error?.message || '저장에 실패했습니다.');
          }
        }}
        onCancel={() => router.push(`/admin/jobs/${encodeURIComponent(item.job.id)}`)}
      />
    </div>
  );
}

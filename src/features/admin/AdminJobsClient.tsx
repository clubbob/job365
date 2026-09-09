'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import {
  adminDangerActionClassName,
  adminJson,
  adminPrimaryActionClassName,
  adminSecondaryActionClassName,
} from '@/lib/admin-ui';
import { deleteMyJobPostingById, listMyJobPostingsWithOwners } from '@/lib/my-job-posts';
import { WORK_TYPE_LABELS, type JobPosting } from '@/types/job';

type JobRow = { ownerId: string; job: JobPosting };

type ListResponse =
  | { ok: true; data: { jobs: JobRow[]; firebaseReady?: boolean } }
  | { ok: false; error?: { message?: string } };

function mergeRows(remote: JobRow[], local: JobRow[]): JobRow[] {
  const map = new Map<string, JobRow>();
  for (const item of local) map.set(item.job.id, item);
  for (const item of remote) map.set(item.job.id, item);
  return [...map.values()].sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt));
}

export default function AdminJobsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<JobRow[]>([]);

  async function load() {
    setLoading(true);
    setError('');
    const local = listMyJobPostingsWithOwners().map((item) => ({ ownerId: item.userId, job: item.job }));
    try {
      const data = await adminJson<ListResponse>('/api/admin/jobs');
      if (!data.ok) throw new Error(data.error?.message || '채용 정보를 불러오지 못했습니다.');
      setRows(mergeRows(data.data.jobs, local));
    } catch (err) {
      setRows(local);
      setError(err instanceof Error ? err.message : '채용 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDelete(row: JobRow) {
    if (!window.confirm(`「${row.job.title}」 채용 정보를 삭제할까요?`)) return;
    deleteMyJobPostingById(row.job.id);
    try {
      await adminJson(`/api/admin/jobs/${encodeURIComponent(row.job.id)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    setRows((current) => current.filter((item) => item.job.id !== row.job.id));
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="채용 정보"
        description="등록된 채용 정보를 확인하고 수정·삭제합니다."
        homeHref="/admin"
        homeLabel="관리 홈"
      />
      <Card>
        {loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">
            {error || '등록된 채용 정보가 없습니다. 회원이 등록하면 여기에 나타납니다.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            {error ? <p className="mb-3 text-sm text-muted">{error}</p> : null}
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="py-2 pr-4 font-semibold">제목</th>
                  <th className="py-2 pr-4 font-semibold">회사</th>
                  <th className="py-2 pr-4 font-semibold">근무 형태</th>
                  <th className="py-2 pr-4 font-semibold">등록일</th>
                  <th className="py-2 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.job.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{row.job.title}</td>
                    <td className="py-2.5 pr-4 text-muted">{row.job.companyName}</td>
                    <td className="py-2.5 pr-4 text-muted">{WORK_TYPE_LABELS[row.job.workType]}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-muted">{row.job.createdAt}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Link href={`/admin/jobs/${encodeURIComponent(row.job.id)}`} className={adminSecondaryActionClassName}>
                          보기
                        </Link>
                        <Link
                          href={`/admin/jobs/${encodeURIComponent(row.job.id)}/edit`}
                          className={adminPrimaryActionClassName}
                        >
                          수정
                        </Link>
                        <button type="button" className={adminDangerActionClassName} onClick={() => void handleDelete(row)}>
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

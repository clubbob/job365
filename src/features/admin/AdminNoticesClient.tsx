'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import {
  adminDangerActionClassName,
  adminJson,
  adminPrimaryActionClassName,
  adminSecondaryActionClassName,
  firebaseAdminUnavailableText,
} from '@/lib/admin-ui';
import {
  formatNoticeDateTime,
  noticePublishStatusClassName,
  noticePublishStatusLabel,
} from '@/lib/notice-display';
import type { Notice } from '@/types/notice';
import { cn } from '@/lib/utils';

type ListResponse =
  | { ok: true; data: { notices: Notice[]; firebaseReady?: boolean; firebaseAdminMessage?: string | null } }
  | { ok: false; error?: { message?: string } };

export default function AdminNoticesClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseAdminMessage, setFirebaseAdminMessage] = useState('');
  const [rows, setRows] = useState<Notice[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await adminJson<ListResponse>('/api/admin/notices');
      if (!data.ok) throw new Error(data.error?.message || '공지사항을 불러오지 못했습니다.');
      setRows(data.data.notices);
      setFirebaseAdminMessage(data.data.firebaseReady === false ? data.data.firebaseAdminMessage ?? '' : '');
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : '공지사항을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDelete(item: Notice) {
    if (!window.confirm(`「${item.title}」 공지사항을 삭제할까요?`)) return;
    setDeletingId(item.id);
    try {
      await adminJson(`/api/admin/notices/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      setRows((current) => current.filter((row) => row.id !== item.id));
      router.refresh();
    } catch {
      setError('공지사항을 삭제하지 못했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  const publishedCount = rows.filter((item) => item.published).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="공지사항"
        description={
          rows.length > 0
            ? `전체 ${rows.length}건 · 공개 ${publishedCount}건`
            : '사이트에 올릴 공지사항을 등록·수정합니다.'
        }
        homeHref="/admin"
        homeLabel="대시보드"
        showRefresh={false}
      />

      <div className="flex justify-end">
        <Link href="/admin/notices/new" className={adminPrimaryActionClassName}>
          공지사항 등록
        </Link>
      </div>

      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}
      {firebaseAdminMessage ? (
        <p className="text-sm text-muted">{firebaseAdminUnavailableText(firebaseAdminMessage)}</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Card>
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted">등록된 공지사항이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="py-2 pr-4 font-semibold">수정일</th>
                  <th className="py-2 pr-4 font-semibold">상태</th>
                  <th className="py-2 pr-4 font-semibold">제목</th>
                  <th className="py-2 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-muted">
                      {formatNoticeDateTime(item.updatedAt || item.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                          noticePublishStatusClassName(item.published),
                        )}
                      >
                        {noticePublishStatusLabel(item.published)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-foreground">{item.title}</td>
                    <td className="py-2.5 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/notices/${encodeURIComponent(item.id)}/edit`}
                          className={adminSecondaryActionClassName}
                        >
                          수정
                        </Link>
                        <button
                          type="button"
                          className={adminDangerActionClassName}
                          disabled={deletingId === item.id}
                          onClick={() => void handleDelete(item)}
                        >
                          {deletingId === item.id ? '삭제 중…' : '삭제'}
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

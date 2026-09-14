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
  firebaseAdminUnavailableText,
} from '@/lib/admin-ui';
import { deleteInquiry, listInquiries } from '@/lib/inquiries-store';
import type { Inquiry } from '@/lib/inquiry';

type ListResponse =
  | { ok: true; data: { inquiries: Inquiry[]; firebaseReady?: boolean; firebaseAdminMessage?: string | null } }
  | { ok: false; error?: { message?: string } };

function mergeInquiries(remote: Inquiry[], local: Inquiry[]): Inquiry[] {
  const map = new Map<string, Inquiry>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function previewMessage(value: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

export default function AdminInquiriesClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseAdminMessage, setFirebaseAdminMessage] = useState('');
  const [rows, setRows] = useState<Inquiry[]>([]);

  async function load() {
    setLoading(true);
    setError('');
    const local = listInquiries();
    try {
      const data = await adminJson<ListResponse>('/api/admin/inquiries');
      if (!data.ok) throw new Error(data.error?.message || '문의를 불러오지 못했습니다.');
      setRows(mergeInquiries(data.data.inquiries, local));
      setFirebaseAdminMessage(data.data.firebaseReady === false ? data.data.firebaseAdminMessage ?? '' : '');
    } catch (err) {
      setRows(local);
      setError(err instanceof Error ? err.message : '문의를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDelete(item: Inquiry) {
    if (!window.confirm(`「${item.name}」님의 문의를 삭제할까요?`)) return;
    deleteInquiry(item.id);
    try {
      await adminJson(`/api/admin/inquiries/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    setRows((current) => current.filter((row) => row.id !== item.id));
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="문의"
        description="회원이 보낸 문의를 확인하고 삭제합니다."
        homeHref="/admin"
        homeLabel="관리 홈"
      />
      <Card>
        {loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">
            {firebaseAdminMessage
              ? firebaseAdminUnavailableText(firebaseAdminMessage)
              : error || '접수된 문의가 없습니다. 회원이 문의하면 여기에 나타납니다.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            {firebaseAdminMessage ? (
              <p className="mb-3 text-sm text-muted">{firebaseAdminUnavailableText(firebaseAdminMessage)}</p>
            ) : null}
            {error ? <p className="mb-3 text-sm text-muted">{error}</p> : null}
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="py-2 pr-4 font-semibold">접수일</th>
                  <th className="py-2 pr-4 font-semibold">이름</th>
                  <th className="py-2 pr-4 font-semibold">이메일</th>
                  <th className="py-2 pr-4 font-semibold">내용</th>
                  <th className="py-2 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-muted whitespace-nowrap">{formatCreatedAt(item.createdAt)}</td>
                    <td className="py-3 pr-4 font-semibold text-foreground">{item.name}</td>
                    <td className="py-3 pr-4 text-muted">{item.email}</td>
                    <td className="max-w-xs py-3 pr-4 text-muted">{previewMessage(item.message)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/admin/inquiries/${encodeURIComponent(item.id)}`}
                          className={adminPrimaryActionClassName}
                        >
                          보기
                        </Link>
                        <button
                          type="button"
                          className={adminDangerActionClassName}
                          onClick={() => void handleDelete(item)}
                        >
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

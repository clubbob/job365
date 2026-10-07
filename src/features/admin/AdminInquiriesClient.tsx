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
import {
  formatInquiryDateTime,
  inquiryReplyStatusClassName,
  inquiryReplyStatusLabel,
} from '@/lib/inquiry-display';
import type { Inquiry } from '@/lib/inquiry';
import { cn } from '@/lib/utils';

type ListResponse =
  | { ok: true; data: { inquiries: Inquiry[]; firebaseReady?: boolean; firebaseAdminMessage?: string | null } }
  | { ok: false; error?: { message?: string } };

function mergeInquiries(remote: Inquiry[], local: Inquiry[]): Inquiry[] {
  const map = new Map<string, Inquiry>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export default function AdminInquiriesClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseAdminMessage, setFirebaseAdminMessage] = useState('');
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!window.confirm(`「${item.title || item.name}」 문의를 삭제할까요?`)) return;
    setDeletingId(item.id);
    deleteInquiry(item.id);
    try {
      await adminJson(`/api/admin/inquiries/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    setRows((current) => current.filter((row) => row.id !== item.id));
    setDeletingId(null);
    router.refresh();
  }

  const pendingCount = rows.filter((item) => !item.reply).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="문의"
        description={
          rows.length > 0
            ? `접수 ${rows.length}건 · 답변 대기 ${pendingCount}건. 답변 버튼을 눌러 내용을 확인하고 회신합니다.`
            : '회원 문의를 확인하고 답변합니다.'
        }
        homeHref="/admin"
        homeLabel="대시보드"
      />

      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}
      {firebaseAdminMessage ? (
        <p className="text-sm text-muted">{firebaseAdminUnavailableText(firebaseAdminMessage)}</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Card>
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted">접수된 문의가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="py-2 pr-4 font-semibold">접수일</th>
                  <th className="py-2 pr-4 font-semibold">상태</th>
                  <th className="py-2 pr-4 font-semibold">제목</th>
                  <th className="py-2 pr-4 font-semibold">닉네임</th>
                  <th className="py-2 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-muted">
                      {formatInquiryDateTime(item.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold',
                          inquiryReplyStatusClassName(item),
                        )}
                      >
                        {inquiryReplyStatusLabel(item)}
                      </span>
                    </td>
                    <td className="max-w-[16rem] py-2.5 pr-4">
                      <Link
                        href={`/admin/inquiries/${encodeURIComponent(item.id)}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {item.title || '(제목 없음)'}
                      </Link>
                      {item.attachment ? (
                        <p className="mt-0.5 text-xs text-subtle">첨부 {item.attachment.fileName}</p>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{item.name}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/admin/inquiries/${encodeURIComponent(item.id)}`}
                          className={adminPrimaryActionClassName}
                        >
                          {item.reply ? '보기' : '답변'}
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

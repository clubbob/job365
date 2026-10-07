'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import InquiryForm from '@/features/inquiry/InquiryForm';
import InquiryHistoryItem from '@/features/inquiry/InquiryHistoryItem';
import type { Inquiry } from '@/lib/inquiry';
import { cn } from '@/lib/utils';

type ListResponse =
  | { ok: true; data: { inquiries: Inquiry[] } }
  | { ok: false; error?: { message?: string } };

const panelClassName = 'rounded-xl border border-border bg-surface shadow-card';

export default function InquiryPanel({ user }: { user: User }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/users/me/inquiries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as ListResponse;
      if (!res.ok || !data.ok) {
        const message = !data.ok ? data.error?.message : undefined;
        throw new Error(message ?? '문의 내역을 불러오지 못했습니다.');
      }
      setInquiries(data.data.inquiries);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSubmitted(inquiry: Inquiry) {
    setInquiries((current) => [inquiry, ...current.filter((item) => item.id !== inquiry.id)]);
    setSuccessMessage('문의를 접수했습니다. 답변은 아래 내역에서 확인할 수 있습니다.');
    setError('');
  }

  async function handleDownloadAttachment(inquiry: Inquiry) {
    if (!inquiry.attachment || downloadingId) return;
    setDownloadingId(inquiry.id);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/users/me/inquiries/${encodeURIComponent(inquiry.id)}/attachment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('첨부 파일을 불러오지 못했습니다.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = inquiry.attachment.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '첨부 파일을 불러오지 못했습니다.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className={cn(panelClassName, 'px-4 py-5 sm:px-6 sm:py-6')}>
        <h2 className="text-sm font-bold text-foreground">새 문의</h2>
        <p className="mt-1 text-sm text-muted">
          서비스 이용, 계정, 채용 정보 등 궁금한 점을 남겨 주세요. 답변은 아래 내역에서 확인할 수 있습니다.
        </p>
        <InquiryForm
          user={user}
          successMessage={successMessage}
          onSubmitted={handleSubmitted}
          onError={() => setSuccessMessage('')}
        />
      </section>

      <section className={cn(panelClassName, 'overflow-hidden')}>
        <header className="border-b border-border px-4 py-3.5 sm:px-6">
          <h2 className="text-[15px] font-bold text-foreground">내 문의 내역</h2>
          <p className="mt-0.5 text-sm text-muted">접수한 문의와 답변을 확인합니다.</p>
        </header>
        {error ? (
          <p className="px-4 py-4 text-sm text-danger sm:px-6" role="alert">{error}</p>
        ) : null}
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted sm:px-6">불러오는 중…</p>
        ) : inquiries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted sm:px-6">아직 남긴 문의가 없습니다.</p>
        ) : (
          <ul>
            {inquiries.map((item) => (
              <InquiryHistoryItem
                key={item.id}
                inquiry={item}
                downloading={downloadingId === item.id}
                onDownloadAttachment={
                  item.attachment
                    ? () => void handleDownloadAttachment(item)
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

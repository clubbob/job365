'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import InquiryDetailContent from '@/features/inquiry/InquiryDetailContent';
import InquiryReplySection from '@/features/inquiry/InquiryReplySection';
import {
  adminDangerActionClassName,
  adminJson,
  adminSecondaryActionClassName,
} from '@/lib/admin-ui';
import { deleteInquiry, getInquiry } from '@/lib/inquiries-store';
import {
  formatInquiryDateTime,
  inquiryReplyStatusClassName,
  inquiryReplyStatusLabel,
} from '@/lib/inquiry-display';
import type { Inquiry } from '@/lib/inquiry';
import { cn } from '@/lib/utils';

type ItemResponse =
  | { ok: true; data: { item: Inquiry | null } }
  | { ok: false; error?: { message?: string } };

export default function AdminInquiryDetailClient({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [item, setItem] = useState<Inquiry | null>(null);
  const [ready, setReady] = useState(false);
  const [draftReply, setDraftReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = getInquiry(inquiryId);
      try {
        const data = await adminJson<ItemResponse>(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}`);
        if (!cancelled && data.ok && data.data.item) {
          setItem(data.data.item);
          setDraftReply(data.data.item.reply?.message ?? '');
          setReady(true);
          return;
        }
      } catch {
        // 로컬 저장 건으로 이어갑니다.
      }
      if (!cancelled) {
        setItem(local);
        setDraftReply(local?.reply?.message ?? '');
        setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  const savedReplyMessage = item?.reply?.message ?? '';
  const replyDirty = draftReply !== savedReplyMessage;

  useEffect(() => {
    if (replyDirty) setReplySuccess('');
  }, [replyDirty]);

  async function handleSaveReply(event: React.FormEvent) {
    event.preventDefault();
    if (!item || saving || !replyDirty) return;
    if (!draftReply.trim()) {
      setReplyError('답변 내용을 입력해 주세요.');
      return;
    }

    setSaving(true);
    setReplyError('');
    setReplySuccess('');
    try {
      const data = await adminJson<ItemResponse>(`/api/admin/inquiries/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draftReply.trim() }),
      });
      if (!data.ok || !data.data.item) {
        const message = !data.ok ? data.error?.message : undefined;
        throw new Error(message ?? '답변을 저장하지 못했습니다.');
      }
      setItem(data.data.item);
      setDraftReply(data.data.item.reply?.message ?? '');
      setReplySuccess('답변을 저장했습니다. 회원 마이페이지 문의 내역에 표시됩니다.');
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : '답변을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancelReply() {
    setDraftReply(savedReplyMessage);
    setReplyError('');
  }

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`「${item.title || item.name}」 문의를 삭제할까요?`)) return;
    deleteInquiry(item.id);
    try {
      await adminJson(`/api/admin/inquiries/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    router.push('/admin/inquiries');
  }

  if (!ready) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-5">
        <PageHeader title="문의 상세" homeHref="/admin/inquiries" homeLabel="목록으로" />
        <Card>
          <p className="text-sm text-muted">문의를 찾을 수 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="문의 상세"
        description={`${item.name} · ${formatInquiryDateTime(item.createdAt)}`}
        homeHref="/admin/inquiries"
        homeLabel="목록으로"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={cn(
            'inline-flex rounded-md px-2.5 py-1 text-xs font-semibold',
            inquiryReplyStatusClassName(item),
          )}
        >
          {inquiryReplyStatusLabel(item)}
        </span>
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${item.email}`} className={adminSecondaryActionClassName}>
            이메일 보내기
          </a>
          <button type="button" className={adminDangerActionClassName} onClick={() => void handleDelete()}>
            삭제
          </button>
        </div>
      </div>

      <Card title="받은 문의">
        <InquiryDetailContent
          inquiry={item}
          showMemberInfo
          attachmentAction={
            item.attachment ? (
              <a
                href={`/api/admin/inquiries/${encodeURIComponent(item.id)}/attachment`}
                className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
              >
                {item.attachment.fileName}
                <span className="text-xs font-normal text-muted">다운로드</span>
              </a>
            ) : undefined
          }
        />
      </Card>

      <InquiryReplySection
        inquiry={item}
        draftReply={draftReply}
        onDraftChange={setDraftReply}
        onSubmit={(event) => void handleSaveReply(event)}
        onCancel={handleCancelReply}
        saving={saving}
        error={replyError}
        success={replySuccess}
        replyDirty={replyDirty}
      />
    </div>
  );
}

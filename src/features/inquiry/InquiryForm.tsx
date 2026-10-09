'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';
import { Button, FieldLabel } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { inputClassName } from '@/features/auth/auth-errors';
import { firstRequiredError } from '@/lib/form-required';
import { createInquiryId, saveInquiry } from '@/lib/inquiries-store';
import type { Inquiry } from '@/lib/inquiry';

const TITLE_MAX = 100;
const MESSAGE_MAX = 2000;
const ATTACHMENT_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.doc,.docx,.xls,.xlsx,.zip,application/pdf,image/*';
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export default function InquiryForm({
  user,
  successMessage,
  initialTitle = '',
  initialMessage = '',
  onSubmitted,
  onError,
}: {
  user: User;
  successMessage?: string;
  initialTitle?: string;
  initialMessage?: string;
  onSubmitted?: (inquiry: Inquiry) => void;
  onError?: (message: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [message, setMessage] = useState(initialMessage);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    const requiredError = firstRequiredError([
      { ok: Boolean(title.trim()), message: '제목을 입력해 주세요.' },
      { ok: Boolean(message.trim()), message: '내용을 입력해 주세요.' },
    ]);
    if (requiredError) {
      setError(requiredError);
      onError?.(requiredError);
      return;
    }

    setError('');
    setSending(true);
    const inquiryId = createInquiryId(user.uid);
    const formData = new FormData();
    formData.append('id', inquiryId);
    formData.append('title', title.trim());
    formData.append('message', message.trim());
    if (attachment) formData.append('attachment', attachment);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: { message?: string };
        data?: { inquiry?: Inquiry };
      };
      if (!res.ok || !data.ok || !data.data?.inquiry) {
        throw new Error(data.error?.message || '문의를 등록하지 못했습니다.');
      }
      saveInquiry(data.data.inquiry);
      setTitle('');
      setMessage('');
      setAttachment(null);
      onSubmitted?.(data.data.inquiry);
    } catch (err) {
      const message = err instanceof Error ? err.message : '문의를 등록하지 못했습니다.';
      setError(message);
      onError?.(message);
    } finally {
      setSending(false);
    }
  }

  function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      const message = '첨부 파일은 10MB 이하만 등록할 수 있습니다.';
      setError(message);
      onError?.(message);
      setAttachment(null);
      return;
    }
    setError('');
    setAttachment(file);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 space-y-4" noValidate>
      <div>
        <FieldLabel htmlFor="inquiry-title" required>제목</FieldLabel>
        <input
          id="inquiry-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClassName}
          placeholder="문의 제목을 입력해 주세요."
          maxLength={TITLE_MAX}
          required
        />
      </div>
      <div>
        <FieldLabel htmlFor="inquiry-message" required>문의 내용</FieldLabel>
        <AutoGrowTextarea
          id="inquiry-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${inputClassName} min-h-36 py-3`}
          placeholder="문의 내용을 자세히 적어 주세요."
          maxLength={MESSAGE_MAX}
          required
        />
      </div>
      <div>
        <FieldLabel htmlFor="inquiry-attachment" optional>첨부 파일</FieldLabel>
        <input
          id="inquiry-attachment"
          type="file"
          accept={ATTACHMENT_ACCEPT}
          onChange={handleAttachmentChange}
          className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-foreground hover:file:bg-neutral-200"
        />
        {attachment ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="break-all">{attachment.name}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="font-semibold text-primary hover:underline"
            >
              제거
            </button>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted">PDF, 이미지, 문서 파일 1개까지 등록할 수 있습니다. (최대 10MB)</p>
        )}
      </div>
      {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}
      {successMessage ? <FormFeedback variant="success">{successMessage}</FormFeedback> : null}
      <Button type="submit" disabled={sending}>
        {sending ? '등록 중…' : '문의하기'}
      </Button>
    </form>
  );
}

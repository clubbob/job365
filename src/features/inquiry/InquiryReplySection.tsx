'use client';

import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { inputClassName } from '@/features/auth/auth-errors';
import { formatInquiryDateTime } from '@/lib/inquiry-display';
import type { Inquiry } from '@/lib/inquiry';

const REPLY_MAX = 5000;

export default function InquiryReplySection({
  inquiry,
  draftReply,
  onDraftChange,
  onSubmit,
  onCancel,
  saving,
  error,
  success,
  replyDirty,
}: {
  inquiry: Inquiry;
  draftReply: string;
  onDraftChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  success: string;
  replyDirty: boolean;
}) {
  return (
    <Card title="답변">
      {inquiry.reply ? (
        <p className="mb-4 text-xs text-subtle">최근 저장 {formatInquiryDateTime(inquiry.reply.repliedAt)}</p>
      ) : (
        <p className="mb-4 text-sm text-muted">답변을 저장하면 회원 마이페이지에 표시됩니다.</p>
      )}
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <FieldLabel htmlFor="inquiry-reply" required>답변 내용</FieldLabel>
          <AutoGrowTextarea
            id="inquiry-reply"
            value={draftReply}
            onChange={(event) => onDraftChange(event.target.value)}
            className={`${inputClassName} min-h-40`}
            maxLength={REPLY_MAX}
            required
          />
        </div>
        {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}
        {success ? <FormFeedback variant="success">{success}</FormFeedback> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!replyDirty || saving || !draftReply.trim()}>
            {saving ? '저장 중…' : '저장'}
          </Button>
          {replyDirty ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-neutral-50"
            >
              취소
            </button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

export function InquiryReplyReadOnly({ inquiry }: { inquiry: Inquiry }) {
  return (
    <Card title="답변">
      {inquiry.reply ? (
        <div className="space-y-2 text-sm">
          <div className="min-h-[6rem] rounded-xl border border-border bg-neutral-50/80 px-4 py-3 whitespace-pre-wrap leading-relaxed text-foreground">
            {inquiry.reply.message}
          </div>
          <p className="text-xs text-subtle">{formatInquiryDateTime(inquiry.reply.repliedAt)}</p>
        </div>
      ) : (
        <p className="text-sm text-muted">답변을 준비 중입니다.</p>
      )}
    </Card>
  );
}

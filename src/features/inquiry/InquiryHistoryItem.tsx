import { formatInquiryDateTime, inquiryReplyStatusLabel } from '@/lib/inquiry-display';
import type { Inquiry } from '@/lib/inquiry';

export default function InquiryHistoryItem({
  inquiry,
  onDownloadAttachment,
  downloading,
}: {
  inquiry: Inquiry;
  onDownloadAttachment?: () => void;
  downloading?: boolean;
}) {
  const hasReply = Boolean(inquiry.reply?.message.trim());

  return (
    <li className="border-t border-border px-4 py-4 first:border-t-0 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{inquiry.title || '(제목 없음)'}</p>
        <span className="text-xs font-medium text-muted">{inquiryReplyStatusLabel(inquiry)}</span>
      </div>
      <p className="mt-1 text-xs text-subtle">{formatInquiryDateTime(inquiry.createdAt)}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">{inquiry.message}</p>
      {inquiry.attachment ? (
        <div className="mt-2">
          {onDownloadAttachment ? (
            <button
              type="button"
              onClick={onDownloadAttachment}
              disabled={downloading}
              className="text-sm font-semibold text-primary hover:underline disabled:opacity-60"
            >
              {downloading ? '다운로드 중…' : inquiry.attachment.fileName}
            </button>
          ) : (
            <p className="text-sm text-muted">첨부 {inquiry.attachment.fileName}</p>
          )}
        </div>
      ) : null}
      {hasReply ? (
        <div className="mt-3 border-l-2 border-foreground pl-3">
          <p className="text-xs text-subtle">
            답변 · {formatInquiryDateTime(inquiry.reply!.repliedAt)}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">
            {inquiry.reply!.message}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">답변을 준비 중입니다.</p>
      )}
    </li>
  );
}

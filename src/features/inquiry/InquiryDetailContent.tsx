import { formatInquiryDateTime, inquiryReplyStatusLabel } from '@/lib/inquiry-display';
import type { Inquiry } from '@/lib/inquiry';
import { cn } from '@/lib/utils';

function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold text-subtle">{label}</dt>
      <dd className="mt-1.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function InquiryDetailContent({
  inquiry,
  showMemberInfo = false,
  attachmentAction,
}: {
  inquiry: Inquiry;
  showMemberInfo?: boolean;
  attachmentAction?: React.ReactNode;
}) {
  return (
    <dl className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailRow label="제목">
          <p className="text-base font-bold text-foreground">{inquiry.title || '(제목 없음)'}</p>
        </DetailRow>
        <DetailRow label="접수일">{formatInquiryDateTime(inquiry.createdAt)}</DetailRow>
        {showMemberInfo ? (
          <>
            <DetailRow label="닉네임">{inquiry.name}</DetailRow>
            <DetailRow label="이메일">
              <a href={`mailto:${inquiry.email}`} className="font-semibold text-primary hover:underline">
                {inquiry.email}
              </a>
            </DetailRow>
          </>
        ) : null}
        <DetailRow label="상태">{inquiryReplyStatusLabel(inquiry)}</DetailRow>
      </div>

      <DetailRow label="내용">
        <div
          className={cn(
            'min-h-[8rem] rounded-xl border border-border bg-neutral-50/80 px-4 py-3',
            'whitespace-pre-wrap leading-relaxed text-foreground',
          )}
        >
          {inquiry.message}
        </div>
      </DetailRow>

      <DetailRow label="첨부 파일">
        {inquiry.attachment ? (
          attachmentAction ?? (
            <span className="font-semibold text-foreground">{inquiry.attachment.fileName}</span>
          )
        ) : (
          <span className="text-muted">없음</span>
        )}
      </DetailRow>
    </dl>
  );
}

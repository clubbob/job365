import type { Inquiry } from '@/lib/inquiry';

export function inquiryReplyStatusLabel(inquiry: Pick<Inquiry, 'reply'>): string {
  return inquiry.reply ? '답변 완료' : '답변 대기';
}

export function inquiryReplyStatusClassName(inquiry: Pick<Inquiry, 'reply'>): string {
  return inquiry.reply
    ? 'bg-primary/10 text-primary'
    : 'bg-neutral-100 text-muted';
}

export function formatInquiryDateTime(value: string): string {
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

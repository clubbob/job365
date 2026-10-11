import { formatInquiryDateTime } from '@/lib/inquiry-display';

export function formatNoticeDateTime(value: string): string {
  return formatInquiryDateTime(value);
}

export function noticePublishStatusLabel(published: boolean): string {
  return published ? '공개' : '비공개';
}

export function noticePublishStatusClassName(published: boolean): string {
  return published ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-muted';
}

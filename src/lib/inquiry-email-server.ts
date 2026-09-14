import { getAdminNotifyEmail } from '@/lib/admin-notify-email';
import { COMPANY } from '@/lib/company';
import type { Inquiry } from '@/lib/inquiry';
import { isEmailServiceConfigured, sendNaverEmail } from '@/lib/naver-smtp';
import { getPublicSiteUrl } from '@/lib/site';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInquiryDateTime(value: string): string {
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

export async function sendInquiryReceivedEmail(inquiry: Inquiry): Promise<void> {
  if (!isEmailServiceConfigured()) return;

  const to = getAdminNotifyEmail();
  if (!to) return;

  const appUrl = getPublicSiteUrl();
  const adminUrl = `${appUrl.replace(/\/$/, '')}/admin/inquiries/${encodeURIComponent(inquiry.id)}`;
  const createdAt = formatInquiryDateTime(inquiry.createdAt);
  const subject = `[${COMPANY.serviceName} 문의] ${inquiry.name}`;

  const text = [
    '새로운 문의가 접수되었습니다.',
    '',
    `이름: ${inquiry.name}`,
    `이메일: ${inquiry.email}`,
    `회원 ID: ${inquiry.userId}`,
    `접수일: ${createdAt}`,
    '',
    inquiry.message,
    '',
    `관리자 페이지: ${adminUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#222;">
      <h2 style="margin:0 0 12px;">새로운 문의가 접수되었습니다</h2>
      <p><strong>이름</strong>: ${escapeHtml(inquiry.name)}</p>
      <p><strong>이메일</strong>: ${escapeHtml(inquiry.email)}</p>
      <p><strong>회원 ID</strong>: ${escapeHtml(inquiry.userId)}</p>
      <p><strong>접수일</strong>: ${escapeHtml(createdAt)}</p>
      <p style="white-space:pre-wrap;">${escapeHtml(inquiry.message)}</p>
      <p><a href="${escapeHtml(adminUrl)}">관리자 페이지 열기</a></p>
    </div>
  `;

  await sendNaverEmail({ to, subject, text, html });
}

export async function notifyAdminNewInquiry(inquiry: Inquiry): Promise<void> {
  try {
    await sendInquiryReceivedEmail(inquiry);
  } catch (error) {
    console.warn('[inquiry-email] notify failed', error);
  }
}

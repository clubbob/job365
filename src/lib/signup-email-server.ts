import { getAdminNotifyEmail } from '@/lib/admin-notify-email';
import { isEmailServiceConfigured, sendNaverEmail } from '@/lib/naver-smtp';
import { getPublicSiteUrl } from '@/lib/site';
import { getProviderLabel } from '@/lib/user-display';
import type { UserProvider } from '@/types/user';

type SignupCreatedEmailInput = {
  uid: string;
  email: string | null;
  nickname: string;
  provider: UserProvider;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSignupDateTime(): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export async function sendSignupCreatedEmail(input: SignupCreatedEmailInput): Promise<void> {
  if (!isEmailServiceConfigured()) return;

  const to = getAdminNotifyEmail();
  if (!to) return;

  const appUrl = getPublicSiteUrl();
  const adminUrl = `${appUrl.replace(/\/$/, '')}/admin/users`;
  const providerLabel = getProviderLabel(input.provider);
  const email = input.email?.trim() || '-';
  const signedUpAt = formatSignupDateTime();
  const subject = `[JOB365 가입] ${input.nickname}`;

  const text = [
    '신규 회원이 가입했습니다.',
    '',
    `회원 ID: ${input.uid}`,
    `닉네임: ${input.nickname}`,
    `이메일: ${email}`,
    `가입 방식: ${providerLabel}`,
    `가입일: ${signedUpAt}`,
    '',
    `관리자 페이지: ${adminUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#222;">
      <h2 style="margin:0 0 12px;">신규 회원이 가입했습니다</h2>
      <p><strong>회원 ID</strong>: ${escapeHtml(input.uid)}</p>
      <p><strong>닉네임</strong>: ${escapeHtml(input.nickname)}</p>
      <p><strong>이메일</strong>: ${escapeHtml(email)}</p>
      <p><strong>가입 방식</strong>: ${escapeHtml(providerLabel)}</p>
      <p><strong>가입일</strong>: ${escapeHtml(signedUpAt)}</p>
      <p><a href="${escapeHtml(adminUrl)}">관리자 페이지 열기</a></p>
    </div>
  `;

  await sendNaverEmail({ to, subject, text, html });
}

export async function notifyAdminNewSignup(input: SignupCreatedEmailInput): Promise<void> {
  try {
    await sendSignupCreatedEmail(input);
  } catch (error) {
    console.warn('[signup-email] notify failed', error);
  }
}

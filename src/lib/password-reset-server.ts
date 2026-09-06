import type { NextRequest } from 'next/server';

export function resolvePublicBaseUrl(req: NextRequest): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (typeof envBaseUrl === 'string' && envBaseUrl.trim()) {
    return envBaseUrl.trim().replace(/\/+$/, '');
  }
  return req.nextUrl.origin.replace(/\/+$/, '');
}

export function toCustomResetUrl(baseUrl: string, firebaseResetLink: string): string {
  try {
    const parsed = new URL(firebaseResetLink);
    const oobCode = parsed.searchParams.get('oobCode');
    if (!oobCode) return firebaseResetLink;
    return `${baseUrl}/reset-password/confirm?oobCode=${encodeURIComponent(oobCode)}`;
  } catch {
    return firebaseResetLink;
  }
}

export function buildPasswordResetEmailHtml(resetLink: string): string {
  return `
    <div style="margin:0; padding:24px 12px; background:#F3F4F6;">
      <div style="font-family: Arial, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; max-width:560px; margin:0 auto; background:#FFFFFF; color:#111827; border:1px solid #E5E7EB; border-radius:14px; overflow:hidden;">
        <div style="padding:18px 22px; border-bottom:1px solid #E5E7EB; background:#F8FAFC;">
          <p style="margin:0; font-size:12px; letter-spacing:0.06em; color:#2563EB; font-weight:700;">JOB 365 ACCOUNT</p>
          <h2 style="margin:8px 0 0 0; font-size:22px; line-height:1.35;">비밀번호 재설정 안내</h2>
        </div>
        <div style="padding:20px 22px;">
          <p style="margin:0 0 16px 0; color:#4B5563; font-size:15px; line-height:1.65;">요청하신 비밀번호 재설정 링크를 보내드립니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.</p>
          <div style="margin:0 0 14px 0;">
            <a
              href="${resetLink}"
              style="display:inline-block; background:#2563EB; color:#FFFFFF; text-decoration:none; font-weight:700; padding:11px 16px; border-radius:10px;"
            >
              비밀번호 재설정
            </a>
          </div>
          <p style="margin:0 0 8px 0; color:#6B7280; font-size:13px; line-height:1.6;">버튼이 동작하지 않으면 아래 링크를 복사해 브라우저 주소창에 붙여 넣어 주세요.</p>
          <p style="margin:0; word-break:break-all; color:#2563EB; font-size:13px; line-height:1.6;">${resetLink}</p>
        </div>
        <div style="padding:14px 22px; border-top:1px solid #E5E7EB; background:#FAFAFA;">
          <p style="margin:0; font-size:12px; color:#6B7280; line-height:1.6;">본인이 요청하지 않았다면 이 메일은 무시해 주세요.</p>
        </div>
      </div>
    </div>
  `;
}

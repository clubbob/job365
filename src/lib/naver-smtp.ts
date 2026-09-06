import nodemailer from 'nodemailer';

const NAVER_SMTP_HOST = process.env.NAVER_SMTP_HOST || 'smtp.naver.com';
const NAVER_SMTP_PORT = Number(process.env.NAVER_SMTP_PORT || 587);
const NAVER_SMTP_SECURE = String(process.env.NAVER_SMTP_SECURE || 'false') === 'true';
const NAVER_SMTP_USER = process.env.NAVER_SMTP_USER;
const NAVER_SMTP_PASS = process.env.NAVER_SMTP_PASS;
const NAVER_SMTP_FROM = process.env.NAVER_SMTP_FROM;

function normalizeNaverLoginUser(user: string): string {
  const trimmed = user.trim();
  if (!trimmed) return trimmed;
  return trimmed.includes('@') ? trimmed : `${trimmed}@naver.com`;
}

function createNaverTransporter() {
  if (!NAVER_SMTP_USER || !NAVER_SMTP_PASS) {
    throw new Error('NAVER_SMTP_USER 또는 NAVER_SMTP_PASS 환경변수가 설정되지 않았습니다.');
  }

  const loginUser = normalizeNaverLoginUser(NAVER_SMTP_USER);

  return nodemailer.createTransport({
    host: NAVER_SMTP_HOST,
    port: NAVER_SMTP_PORT,
    secure: NAVER_SMTP_SECURE,
    auth: {
      user: loginUser,
      pass: NAVER_SMTP_PASS,
    },
  });
}

export function isEmailServiceConfigured(): boolean {
  if (process.env.DISABLE_EMAIL_SERVICE === 'true') return false;
  return Boolean(NAVER_SMTP_USER?.trim() && NAVER_SMTP_PASS?.trim());
}

export async function sendNaverEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createNaverTransporter();
    await transporter.sendMail({
      from: NAVER_SMTP_FROM || NAVER_SMTP_USER,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { success: true, message: '이메일 발송 성공' };
  } catch (error) {
    console.error('[naver-smtp] 이메일 발송 실패', error);
    return { success: false, message: error instanceof Error ? error.message : '이메일 발송 실패' };
  }
}

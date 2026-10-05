import nodemailer from 'nodemailer';

function readEnv(primary: string, legacy?: string): string | undefined {
  const value = process.env[primary]?.trim();
  if (value) return value;
  if (legacy) return process.env[legacy]?.trim();
  return undefined;
}

const SMTP_HOST = readEnv('SMTP_HOST', 'NAVER_SMTP_HOST') ?? 'smtp.gmail.com';
const SMTP_PORT = Number(readEnv('SMTP_PORT', 'NAVER_SMTP_PORT') ?? 587);
const SMTP_SECURE = String(readEnv('SMTP_SECURE', 'NAVER_SMTP_SECURE') ?? 'false') === 'true';
const SMTP_USER = readEnv('SMTP_USER', 'NAVER_SMTP_USER');
const SMTP_PASS = readEnv('SMTP_PASS', 'NAVER_SMTP_PASS');
const SMTP_FROM = readEnv('SMTP_FROM', 'NAVER_SMTP_FROM');

function normalizeSmtpLoginUser(user: string, host: string): string {
  const trimmed = user.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('@')) return trimmed;
  if (host.includes('naver.com')) return `${trimmed}@naver.com`;
  return trimmed;
}

function createTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP_USER 또는 SMTP_PASS 환경 변수가 설정되지 않았습니다.');
  }

  const loginUser = normalizeSmtpLoginUser(SMTP_USER, SMTP_HOST);

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: loginUser,
      pass: SMTP_PASS,
    },
  });
}

export function isEmailServiceConfigured(): boolean {
  if (process.env.DISABLE_EMAIL_SERVICE === 'true') return false;
  return Boolean(SMTP_USER && SMTP_PASS);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { success: true, message: '이메일 발송 성공' };
  } catch (error) {
    console.error('[smtp] 이메일 발송 실패', error);
    return { success: false, message: error instanceof Error ? error.message : '이메일 발송 실패' };
  }
}

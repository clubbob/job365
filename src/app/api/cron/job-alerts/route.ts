import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron-auth';
import { sendDailyJobAlertEmails } from '@/lib/job-alert-email-server';

export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  try {
    const summary = await sendDailyJobAlertEmails();
    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    console.error('[cron/job-alerts] failed', error);
    const message = error instanceof Error ? error.message : '이메일 발송에 실패했습니다.';
    const status = message === 'EMAIL_NOT_CONFIGURED' ? 503 : 500;
    return NextResponse.json(
      { ok: false, error: { code: 'EMAIL_FAILED', message } },
      { status },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

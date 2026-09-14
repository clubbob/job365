import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { createStoredInquiry } from '@/lib/inquiries-server';
import { notifyAdminNewInquiry } from '@/lib/inquiry-email-server';
import { isValidEmail } from '@/lib/talent-contact';
import type { Inquiry } from '@/lib/inquiry';

const NAME_MAX = 50;
const MESSAGE_MAX = 2000;

function trimText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json(
      { ok: false, error: { code: 'AUTH_REQUIRED', message: '로그인 후 문의해 주세요.' } },
      { status: 401 },
    );
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json(
      { ok: false, error: { code: 'AUTH_INVALID', message: '로그인 정보를 확인할 수 없습니다.' } },
      { status: 401 },
    );
  }

  let body: { id?: string; name?: string; email?: string; message?: string };
  try {
    body = (await request.json()) as { id?: string; name?: string; email?: string; message?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: '문의 내용이 올바르지 않습니다.' } },
      { status: 400 },
    );
  }

  const name = trimText(body.name, NAME_MAX);
  const email = trimText(body.email, 120);
  const message = trimText(body.message, MESSAGE_MAX);
  const id = trimText(body.id, 120);

  if (!name) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_NAME', message: '이름을 입력해 주세요.' } },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_EMAIL', message: '이메일을 입력해 주세요.' } },
      { status: 400 },
    );
  }
  if (!message) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_MESSAGE', message: '내용을 입력해 주세요.' } },
      { status: 400 },
    );
  }
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ID', message: '문의를 저장하지 못했습니다.' } },
      { status: 400 },
    );
  }

  const inquiry: Inquiry = {
    id,
    userId: decoded.uid,
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseAdminReady()) {
    await notifyAdminNewInquiry(inquiry);
    return NextResponse.json({
      ok: true,
      data: { inquiry, firebaseReady: false },
    });
  }

  try {
    const saved = await createStoredInquiry(inquiry);
    await notifyAdminNewInquiry(saved);
    return NextResponse.json({ ok: true, data: { inquiry: saved, firebaseReady: true } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'SAVE_FAILED', message: '문의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' } },
      { status: 500 },
    );
  }
}

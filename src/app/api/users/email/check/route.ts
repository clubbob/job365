import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebaseAdmin';
import { isValidEmail } from '@/features/auth/auth-errors';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = normalizeEmail(searchParams.get('email') ?? '');

  if (!email) {
    return NextResponse.json({
      ok: true,
      data: { available: false, reason: '이메일을 입력해 주세요.' },
    });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({
      ok: true,
      data: { available: false, reason: '올바른 이메일 주소를 입력해 주세요.' },
    });
  }

  const app = getAdminApp();
  if (!app) {
    return NextResponse.json(
      { ok: false, error: { code: 'ADMIN_NOT_CONFIGURED', message: '서버 설정을 확인해 주세요.' } },
      { status: 503 },
    );
  }

  try {
    await getAuth(app).getUserByEmail(email);
    return NextResponse.json({
      ok: true,
      data: { available: false, reason: '이미 사용 중인 이메일입니다.' },
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (code === 'auth/user-not-found') {
      return NextResponse.json({
        ok: true,
        data: { available: true, reason: null },
      });
    }

    console.error('[email/check] failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'CHECK_FAILED', message: '이메일 확인에 실패했습니다.' } },
      { status: 500 },
    );
  }
}

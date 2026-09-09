import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminSessionToken,
  isAdminAuthConfigured,
  verifyAdminCredentials,
} from '@/lib/admin-auth';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'ADMIN_AUTH_NOT_CONFIGURED',
          message: '관리자 계정이 설정되지 않았습니다. ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET를 확인해 주세요.',
        },
      },
      { status: 503 },
    );
  }

  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'TOO_MANY_ATTEMPTS', message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      },
      { status: 429 },
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: '아이디와 비밀번호를 입력해 주세요.' } },
      { status: 400 },
    );
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json(
      { ok: false, error: { code: 'ADMIN_AUTH_INVALID', message: '아이디 또는 비밀번호가 올바르지 않습니다.' } },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, data: { authenticated: true } });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), adminCookieOptions());
  return response;
}

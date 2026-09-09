import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'job365_admin_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 12;

type AdminCredentials = {
  username: string;
  password: string;
  secret: string;
};

function getAdminCredentials(): AdminCredentials | null {
  const username = process.env.ADMIN_USERNAME?.trim() ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() ?? '';
  if (!username || !password || !secret) return null;
  return { username, password, secret };
}

function hmac(value: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(value).digest();
}

function timingSafeEqualString(left: string, right: string, secret: string): boolean {
  const leftHash = hmac(left, secret);
  const rightHash = hmac(right, secret);
  return timingSafeEqual(leftHash, rightHash);
}

export function isAdminAuthConfigured(): boolean {
  return getAdminCredentials() !== null;
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const creds = getAdminCredentials();
  if (!creds) return false;
  const userOk = timingSafeEqualString(username.trim(), creds.username, creds.secret);
  const passOk = timingSafeEqualString(password, creds.password, creds.secret);
  return userOk && passOk;
}

export function createAdminSessionToken(): string {
  const creds = getAdminCredentials();
  if (!creds) throw new Error('ADMIN_AUTH_NOT_CONFIGURED');
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const payload = Buffer.from(JSON.stringify({ v: 1, role: 'admin', exp }), 'utf8').toString(
    'base64url',
  );
  const signature = hmac(payload, creds.secret).toString('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  const creds = getAdminCredentials();
  if (!creds) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = hmac(payload, creds.secret).toString('base64url');
  if (!timingSafeEqualString(signature, expected, creds.secret)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: number;
      role?: string;
      exp?: number;
    };
    if (data.v !== 1 || data.role !== 'admin' || typeof data.exp !== 'number') return false;
    return data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function adminCookieOptions(maxAge = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function readAdminSession(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return Boolean(token && verifyAdminSessionToken(token));
}

export async function requireAdminSession(): Promise<NextResponse | null> {
  const ok = await readAdminSession();
  if (ok) return null;
  return NextResponse.json(
    { ok: false, error: { code: 'ADMIN_AUTH_REQUIRED', message: '관리자 로그인이 필요합니다.' } },
    { status: 401 },
  );
}

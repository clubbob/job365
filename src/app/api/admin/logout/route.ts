import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, adminCookieOptions } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true, data: { authenticated: false } });
  response.cookies.set(ADMIN_COOKIE_NAME, '', adminCookieOptions(0));
  return response;
}

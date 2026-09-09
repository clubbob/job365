import { NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-auth';

export async function GET() {
  const authenticated = await readAdminSession();
  return NextResponse.json({ ok: true, data: { authenticated } });
}

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { listUserAccounts } from '@/lib/users-server';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: { users: [], firebaseReady: false },
    });
  }

  const users = await listUserAccounts(200);
  return NextResponse.json({
    ok: true,
    data: { users, firebaseReady: true },
  });
}

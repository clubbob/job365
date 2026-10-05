import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { listWithdrawalLogs } from '@/lib/withdrawals-server';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: true, data: { withdrawals: [], ...firebaseAdminListFields() } });
  }

  try {
    const withdrawals = await listWithdrawalLogs();
    return NextResponse.json({ ok: true, data: { withdrawals, ...firebaseAdminListFields() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '탈퇴 내역을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

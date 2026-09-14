import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { listStoredInquiries } from '@/lib/inquiries-server';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: { inquiries: [], firebaseReady: false },
    });
  }

  try {
    const inquiries = await listStoredInquiries();
    return NextResponse.json({
      ok: true,
      data: { inquiries, firebaseReady: true },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '문의를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

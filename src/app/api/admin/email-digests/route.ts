import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { listEmailDigests } from '@/lib/email-digests-server';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: true, data: { digests: [], ...firebaseAdminListFields() } });
  }

  try {
    const digests = await listEmailDigests();
    return NextResponse.json({ ok: true, data: { digests, ...firebaseAdminListFields() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '이메일 발송 내역을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

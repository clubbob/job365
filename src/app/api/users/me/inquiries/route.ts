import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { listInquiries } from '@/lib/inquiries-store';
import { listStoredInquiriesByUser } from '@/lib/inquiries-server';
import { normalizeInquiry } from '@/lib/inquiry';

async function requireUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 }) };
  }
  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return { error: NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 }) };
  }
  return { uid: decoded.uid };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    if (isFirebaseAdminReady()) {
      const inquiries = await listStoredInquiriesByUser(auth.uid);
      return NextResponse.json({ ok: true, data: { inquiries } });
    }

    const inquiries = listInquiries(auth.uid)
      .map((item) => normalizeInquiry(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    return NextResponse.json({ ok: true, data: { inquiries, firebaseReady: false } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '문의 목록을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

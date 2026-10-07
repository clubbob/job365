import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { getInquiry } from '@/lib/inquiries-store';
import { getStoredInquiry } from '@/lib/inquiries-server';
import { normalizeInquiry } from '@/lib/inquiry';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 });
  }

  const { id } = await params;

  try {
    if (isFirebaseAdminReady()) {
      const item = await getStoredInquiry(id);
      if (!item || item.userId !== decoded.uid) {
        return NextResponse.json(
          { ok: false, error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' } },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, data: { item } });
    }

    const local = normalizeInquiry(getInquiry(id));
    if (!local || local.userId !== decoded.uid) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data: { item: local, firebaseReady: false } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '문의를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

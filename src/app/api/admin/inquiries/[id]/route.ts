import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { deleteStoredInquiry, getStoredInquiry } from '@/lib/inquiries-server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: true, data: { item: null, firebaseReady: false } });
  }

  try {
    const item = await getStoredInquiry(id);
    if (!item) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data: { item, firebaseReady: true } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '문의를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  try {
    const deleted = await deleteStoredInquiry(id);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'DELETE_FAILED', message: '문의를 삭제하지 못했습니다.' } },
      { status: 500 },
    );
  }
}

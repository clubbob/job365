import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { deleteUserAccount, getUserAccount } from '@/lib/users-server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  const { id } = await params;
  const uid = decodeURIComponent(id).trim();
  if (!uid) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ID', message: '회원 정보가 올바르지 않습니다.' } },
      { status: 400 },
    );
  }

  const account = await getUserAccount(uid);
  if (!account) {
    return NextResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: '회원을 찾을 수 없습니다.' } },
      { status: 404 },
    );
  }

  if (account.profile.role === 'admin') {
    return NextResponse.json(
      { ok: false, error: { code: 'ADMIN_CANNOT_DELETE', message: '관리자 계정은 삭제할 수 없습니다.' } },
      { status: 403 },
    );
  }

  try {
    await deleteUserAccount(uid);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'DELETE_FAILED', message: '회원을 삭제하지 못했습니다.' } },
      { status: 500 },
    );
  }
}

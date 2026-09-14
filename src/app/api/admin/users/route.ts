import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { listUserAccounts } from '@/lib/users-server';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const meta = firebaseAdminListFields();
  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: { users: [], ...meta },
    });
  }

  try {
    const users = await listUserAccounts(200);
    return NextResponse.json({
      ok: true,
      data: { users, ...meta },
    });
  } catch (error) {
    console.error('[admin-users] list failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'LOAD_FAILED',
          message: '회원 목록을 불러오지 못했습니다. Firestore 권한 또는 프로젝트 ID를 확인해 주세요.',
        },
        data: { users: [], ...meta },
      },
      { status: 500 },
    );
  }
}

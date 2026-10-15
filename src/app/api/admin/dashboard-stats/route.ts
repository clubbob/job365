import { NextResponse } from 'next/server';
import { getAdminDashboardStats } from '@/lib/admin-dashboard-stats';
import { requireAdminSession } from '@/lib/admin-auth';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const meta = firebaseAdminListFields();
  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: {
        stats: null,
        ...meta,
      },
    });
  }

  try {
    const stats = await getAdminDashboardStats();
    return NextResponse.json({ ok: true, data: { stats, ...meta } });
  } catch (error) {
    console.error('[admin/dashboard-stats] failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '대시보드 통계를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { ADMIN_CRAWL_RUNS_RETENTION_DAYS } from '@/lib/admin-constants';
import { deleteCrawlRunsOlderThanDays } from '@/lib/crawl-runs-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json(
      { ok: false, error: { code: 'FIRESTORE_UNAVAILABLE', message: 'Firestore를 사용할 수 없습니다.' } },
      { status: 503 },
    );
  }

  let olderThanDays = ADMIN_CRAWL_RUNS_RETENTION_DAYS;
  try {
    const body = (await request.json()) as { olderThanDays?: number };
    if (typeof body.olderThanDays === 'number' && Number.isFinite(body.olderThanDays)) {
      olderThanDays = body.olderThanDays;
    }
  } catch {
    // 기본 보관 일수 사용
  }

  try {
    const { deleted } = await deleteCrawlRunsOlderThanDays(olderThanDays);
    return NextResponse.json({
      ok: true,
      data: { deleted, olderThanDays: Math.max(1, Math.min(Math.floor(olderThanDays), 365)) },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'PURGE_FAILED', message: '오래된 실행 내역을 삭제하지 못했습니다.' } },
      { status: 500 },
    );
  }
}

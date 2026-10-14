import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getDailyCrawlCollectionStats } from '@/lib/crawl-collection-daily-stats';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const days = Math.max(7, Math.min(120, Number(searchParams.get('days') ?? 30) || 30));

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: { days, series: [], ...firebaseAdminListFields() },
    });
  }

  try {
    const series = await getDailyCrawlCollectionStats(days);
    return NextResponse.json({
      ok: true,
      data: { days, series, ...firebaseAdminListFields() },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '수집 데이터 통계를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

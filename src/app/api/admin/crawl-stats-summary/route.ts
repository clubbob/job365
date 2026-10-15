import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getCrawlStatsSummary } from '@/lib/crawl-stats-summary';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: {
        companyCount: 0,
        fetched: 0,
        saved: 0,
        closed: 0,
        activeJobs: 0,
        lastRun: null,
        ...firebaseAdminListFields(),
      },
    });
  }

  try {
    const summary = await getCrawlStatsSummary();
    return NextResponse.json({ ok: true, data: { ...summary, ...firebaseAdminListFields() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '수집 통계를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getCrawlStatsSummary } from '@/lib/crawl-stats-summary';
import { emptyCompanySegmentCounts } from '@/lib/job-board/company-segment';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: {
        companyCount: 0,
        companyRegistryBySegment: { enterprise: 0, 'mid-sized': 0, it: 0, 'semi-equipment': 0 },
        fetched: 0,
        fetchedBySegment: emptyCompanySegmentCounts(),
        closed: 0,
        closedBySegment: emptyCompanySegmentCounts(),
        activeJobs: 0,
        activeJobsBySegment: emptyCompanySegmentCounts(),
        storedActiveJobs: 0,
        storedActiveJobsBySegment: emptyCompanySegmentCounts(),
        lastRun: null,
        ...firebaseAdminListFields(),
      },
    });
  }

  try {
    const summary = await getCrawlStatsSummary();
    return NextResponse.json({ ok: true, data: { ...summary, ...firebaseAdminListFields() } });
  } catch (error) {
    console.error('[crawl-stats-summary] GET failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '수집 통계를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

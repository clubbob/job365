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
        companyRegistryBySegment: { enterprise: 0, 'mid-sized': 0, misc: 0, it: 0 },
        fetched: 0,
        fetchedBySegment: {
          '대기업·계열사': 0,
          '중견 기업': 0,
          'IT 회사': 0,
        },
        closed: 0,
        closedBySegment: {
          '대기업·계열사': 0,
          '중견 기업': 0,
          'IT 회사': 0,
        },
        activeJobs: 0,
        activeJobsBySegment: {
          '대기업·계열사': 0,
          '중견 기업': 0,
          'IT 회사': 0,
        },
        storedActiveJobs: 0,
        storedActiveJobsBySegment: {
          '대기업·계열사': 0,
          '중견 기업': 0,
          'IT 회사': 0,
        },
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

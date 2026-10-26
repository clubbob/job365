import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getAdminCrawlSegmentCountsForTabs } from '@/lib/crawled-jobs-server';
import { emptyCompanySegmentCounts } from '@/lib/job-board/company-segment';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: {
        storedActiveJobsBySegment: emptyCompanySegmentCounts(),
        activeJobsBySegment: emptyCompanySegmentCounts(),
        ...firebaseAdminListFields(),
      },
    });
  }

  try {
    const counts = await getAdminCrawlSegmentCountsForTabs();
    return NextResponse.json({ ok: true, data: { ...counts, ...firebaseAdminListFields() } });
  } catch (error) {
    console.error('[crawl-segment-counts] GET failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '분류별 건수를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

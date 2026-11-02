import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import {
  ADMIN_CRAWL_ACTIVITY_LOG_DAILY,
  ADMIN_CRAWL_ACTIVITY_LOG_RUNS,
  ADMIN_CRAWL_RUNS_RETENTION_DAYS,
} from '@/lib/admin-constants';
import { buildAdminCrawlActivityLogPayload } from '@/lib/admin-crawl-activity-log';
import { listCrawlRunsPage } from '@/lib/crawl-runs-server';
import { listCrawlStatsDaily } from '@/lib/crawl-stats-daily-server';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: {
        runs: [],
        daily: [],
        retentionDays: ADMIN_CRAWL_RUNS_RETENTION_DAYS,
        ...firebaseAdminListFields(),
      },
    });
  }

  try {
    const [runsPage, daily] = await Promise.all([
      listCrawlRunsPage(1, ADMIN_CRAWL_ACTIVITY_LOG_RUNS),
      listCrawlStatsDaily(ADMIN_CRAWL_ACTIVITY_LOG_DAILY),
    ]);
    const data = buildAdminCrawlActivityLogPayload(runsPage.runs, daily);
    return NextResponse.json({ ok: true, data: { ...data, ...firebaseAdminListFields() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '수집·노출 내역을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

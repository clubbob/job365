import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { listCrawlRuns } from '@/lib/crawl-runs-server';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: true, data: { runs: [], ...firebaseAdminListFields() } });
  }

  try {
    const runs = await listCrawlRuns();
    return NextResponse.json({ ok: true, data: { runs, ...firebaseAdminListFields() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '크롤링 내역을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

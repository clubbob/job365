import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { ADMIN_CRAWL_RUNS_PAGE_SIZE } from '@/lib/admin-constants';
import { listCrawlRunsPage } from '@/lib/crawl-runs-server';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(
    ADMIN_CRAWL_RUNS_PAGE_SIZE,
    Math.max(1, Number(searchParams.get('pageSize') ?? ADMIN_CRAWL_RUNS_PAGE_SIZE) || ADMIN_CRAWL_RUNS_PAGE_SIZE),
  );

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: {
        runs: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
        ...firebaseAdminListFields(),
      },
    });
  }

  try {
    const result = await listCrawlRunsPage(page, pageSize);
    return NextResponse.json({ ok: true, data: { ...result, ...firebaseAdminListFields() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '크롤링 내역을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { ADMIN_CRAWLED_JOBS_PAGE_SIZE } from '@/lib/admin-constants';
import {
  listCrawledJobsForAdminPage,
  type AdminCrawledJobsBoardFilter,
  type AdminCrawledJobsStatusFilter,
} from '@/lib/crawled-jobs-server';
import { isJobBoardCompanySegment } from '@/lib/job-board/company-segment';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 120;

function parseStatusFilter(value: string | null): AdminCrawledJobsStatusFilter {
  if (value === 'all' || value === 'closed') return value;
  return 'active';
}

function parseBoardFilter(value: string | null): AdminCrawledJobsBoardFilter {
  if (value === 'on_board' || value === 'off_board') return value;
  return 'all';
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(
    ADMIN_CRAWLED_JOBS_PAGE_SIZE,
    Math.max(1, Number(searchParams.get('pageSize') ?? ADMIN_CRAWLED_JOBS_PAGE_SIZE) || ADMIN_CRAWLED_JOBS_PAGE_SIZE),
  );
  const status = parseStatusFilter(searchParams.get('status'));
  const board = parseBoardFilter(searchParams.get('board'));
  const q = searchParams.get('q')?.trim() ?? '';
  const companySegmentRaw = searchParams.get('companySegment')?.trim() ?? '';
  const companySegment = isJobBoardCompanySegment(companySegmentRaw) ? companySegmentRaw : undefined;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: {
        jobs: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
        ...firebaseAdminListFields(),
      },
    });
  }

  try {
    const result = await listCrawledJobsForAdminPage(
      page,
      pageSize,
      status,
      q,
      board,
      companySegment,
    );
    return NextResponse.json({ ok: true, data: { ...result, ...firebaseAdminListFields() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '수집 공고를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

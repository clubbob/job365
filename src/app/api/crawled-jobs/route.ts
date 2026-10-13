import { NextResponse } from 'next/server';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';
import type { JobBoardFilters } from '@/lib/job-board/match';
import { listActiveCrawledJobsPage, listFilteredCrawledJobsPage } from '@/lib/crawled-jobs-server';
import {
  isEmploymentType,
  isJobRegion,
  parseJobRoles,
} from '@/lib/job-board/constants';
import { parseJobBoardCompanySegments } from '@/lib/job-board/company-segment';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const todayOnly = searchParams.get('today') === '1';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? JOB_LIST_PAGE_SIZE) || JOB_LIST_PAGE_SIZE));

  const employmentTypes = searchParams.getAll('employmentType').filter(isEmploymentType);
  const companySegments = parseJobBoardCompanySegments(searchParams.getAll('companySegment'));
  const roles = parseJobRoles(searchParams.getAll('role'));
  const regions = searchParams.getAll('region').filter(isJobRegion);

  const todayDate = getKoreaDateLocalToday();
  const isUnfiltered =
    !q &&
    employmentTypes.length === 0 &&
    companySegments.length === 0 &&
    roles.length === 0 &&
    regions.length === 0 &&
    !todayOnly;

  try {
    if (isUnfiltered && !todayOnly) {
      const { items, total } = await listActiveCrawledJobsPage(page, pageSize);
      const hasMore = (page - 1) * pageSize + items.length < total;

      return NextResponse.json({
        ok: true,
        data: {
          items,
          total,
          page,
          pageSize,
          hasMore,
          todayDate,
        },
      });
    }

    const boardFilters: JobBoardFilters = {
      q,
      employmentTypes,
      companySegments,
      roles,
      regions,
      todayOnly,
      todayDate,
    };

    const { items, total } = await listFilteredCrawledJobsPage(page, pageSize, boardFilters);
    const start = (page - 1) * pageSize;
    const hasMore = start + items.length < total;

    return NextResponse.json({
      ok: true,
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore,
        todayDate,
      },
    });
  } catch (error) {
    console.error('[crawled-jobs] list failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'LIST_FAILED', message: '채용 공고를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { jobMatchesBoardFilters } from '@/lib/job-board/match';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';
import { listCrawledJobs } from '@/lib/crawled-jobs-server';
import {
  isEmploymentType,
  isJobRegion,
  isJobRole,
} from '@/lib/job-board/constants';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const quickFilter = searchParams.get('quick') ?? 'all';
  const todayOnly = searchParams.get('today') === '1';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? JOB_LIST_PAGE_SIZE) || JOB_LIST_PAGE_SIZE));

  const employmentTypes = searchParams.getAll('employmentType').filter(isEmploymentType);
  const roles = searchParams.getAll('role').filter(isJobRole);
  const regions = searchParams.getAll('region').filter(isJobRegion);

  const todayDate = getKoreaDateLocalToday();

  try {
    const all = await listCrawledJobs();
    const filtered = all.filter((job) =>
      jobMatchesBoardFilters(job, {
        q,
        quickFilter:
          quickFilter === '신입' ||
          quickFilter === '경력' ||
          quickFilter === '인턴' ||
          quickFilter === '계약직'
            ? quickFilter
            : 'all',
        employmentTypes,
        roles,
        regions,
        todayOnly,
        todayDate,
      }),
    );

    const total = filtered.length;
    const items = filtered.slice(0, page * pageSize);
    const hasMore = items.length < total;

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

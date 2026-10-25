import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getCrawledJobSourceStats } from '@/lib/crawled-jobs-server';
import {
  buildAdminRecruitingCompanyListPage,
  computeRecruitingCompanyActiveCounts,
  countRecruitingCompaniesWithActiveJobs,
  getRecruitingSegmentRegistryCounts,
  recruitingSegmentRegistryCount,
} from '@/lib/recruiting-employers/admin-list';
import { loadMidSizedRegistryDbCompanies } from '@/lib/mid-sized-companies/registry-db';
import type { RecruitingEmployerAdminSegment } from '@/lib/recruiting-employers/segments';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const maxDuration = 120;

function parseSegment(value: string | null): RecruitingEmployerAdminSegment | null {
  if (value === 'misc') return 'mid-sized';
  if (
    value === 'enterprise' ||
    value === 'mid-sized' ||
    value === 'it' ||
    value === 'semi-equipment'
  ) {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const registryCountsOnly = searchParams.get('registryCounts') === '1';
  const summaryAll = searchParams.get('summary') === 'all';
  const segment = parseSegment(searchParams.get('segment'));
  const summaryOnly = searchParams.get('summary') === '1';

  if (registryCountsOnly) {
    return NextResponse.json({
      ok: true,
      data: { registryCounts: getRecruitingSegmentRegistryCounts() },
    });
  }

  if (!summaryAll && !segment) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_SEGMENT', message: 'segment가 필요합니다.' } },
      { status: 400 },
    );
  }

  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const jobsOnly = searchParams.get('jobsOnly') === '1';
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));

  try {
    if (summaryAll) {
      const stats = await getCrawledJobSourceStats({ skipDisplayFilters: true });
      return NextResponse.json({
        ok: true,
        data: {
          counts: computeRecruitingCompanyActiveCounts(stats),
          midSizedRegistryCount: loadMidSizedRegistryDbCompanies().length,
        },
      });
    }

    const stats = await getCrawledJobSourceStats({ skipDisplayFilters: true });

    if (summaryOnly && segment) {
      const withActiveJobsCount = countRecruitingCompaniesWithActiveJobs(segment, stats);
      return NextResponse.json({
        ok: true,
        data: {
          items: [],
          total: 0,
          linkedCount: 0,
          offset: 0,
          limit: 0,
          hasMore: false,
          uniqueCompanyCount:
            segment === 'mid-sized' ? loadMidSizedRegistryDbCompanies().length : withActiveJobsCount,
          withActiveJobsCount,
          registryCount: recruitingSegmentRegistryCount(segment),
        },
      });
    }

    const pageResult = buildAdminRecruitingCompanyListPage(segment!, stats, {
      offset,
      limit,
      q,
      jobsOnly,
    });
    const registryCount = recruitingSegmentRegistryCount(segment!);

    return NextResponse.json({
      ok: true,
      data: {
        items: pageResult.items,
        total: pageResult.total,
        linkedCount: pageResult.linkedCount,
        offset,
        limit,
        hasMore: offset + limit < pageResult.total,
        uniqueCompanyCount: registryCount,
        withActiveJobsCount: pageResult.withActiveJobsCount,
        registryCount,
      },
    });
  } catch (error) {
    console.error('[admin/recruiting-companies] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'LIST_FAILED', message: '수집 채용 회사 목록을 불러오지 못했습니다.' },
      },
      { status: 500 },
    );
  }
}

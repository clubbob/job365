import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getCrawledJobSourceStats } from '@/lib/crawled-jobs-server';
import { buildItCompanyRegistryRows } from '@/lib/it-companies/build-registry-rows';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const activeOnly = searchParams.get('activeOnly') === '1';
  const segment = searchParams.get('segment')?.trim();
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));

  let jobCountsBySource: Record<string, number> = {};
  try {
    const stats = await getCrawledJobSourceStats({ skipDisplayFilters: true });
    jobCountsBySource = stats.jobCountsBySource;
  } catch {
    jobCountsBySource = {};
  }

  let rows = buildItCompanyRegistryRows(jobCountsBySource);

  if (segment === 'enterprise' || segment === 'mid-sized') {
    rows = [];
  }

  if (activeOnly) rows = rows.filter((row) => row.active === true || row.active === null);

  if (q) {
    rows = rows.filter((row) => row.companyName.toLowerCase().includes(q));
  }

  const total = rows.length;
  const linkedCount = rows.filter((row) => row.linked).length;

  const allRows = buildItCompanyRegistryRows(jobCountsBySource);
  const page = rows.slice(offset, offset + limit);

  return NextResponse.json({
    ok: true,
    data: {
      items: page,
      total,
      linkedCount,
      offset,
      limit,
      hasMore: offset + limit < total,
      uniqueCompanyCount: allRows.length,
      enterpriseCount: 0,
      midSizedCount: 0,
      activeCertificateCount: allRows.filter((row) => row.active === true).length,
      probedCount: allRows.filter((row) =>
        row.careersDiscoveryStatus === 'found' || row.careersDiscoveryStatus === 'not_found',
      ).length,
      notFoundCount: allRows.filter((row) => row.careersDiscoveryStatus === 'not_found').length,
      pendingCount: allRows.filter((row) => row.careersDiscoveryStatus === 'pending').length,
      targetsOnDisk: allRows.filter((row) => row.linked).length,
    },
  });
}

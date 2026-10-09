import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import {
  loadMidSizedRegistryDbCompanies,
  loadMidSizedRegistryDbFromDisk,
} from '@/lib/mid-sized-companies/registry-db';
import { isMidSizedCertificateActive } from '@/lib/mid-sized-companies/registry-dedupe';
import { loadMidSizedRegistryFromDisk } from '@/lib/mid-sized-companies-server';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const activeOnly = searchParams.get('activeOnly') === '1';
  const linkedOnly = searchParams.get('linkedOnly') === '1';
  const notFoundOnly = searchParams.get('notFoundOnly') === '1';
  const pendingOnly = searchParams.get('pendingOnly') === '1';
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));

  const dbFile = loadMidSizedRegistryDbFromDisk();
  const uniqueCompanies = loadMidSizedRegistryDbCompanies();
  const mme = loadMidSizedRegistryFromDisk();

  let rows = uniqueCompanies.map((record) => {
    const careersUrl = record.careersUrl?.trim() || null;
    return {
      companyName: record.companyName,
      businessNumber: record.businessNumber,
      validTo: record.validTo,
      active: isMidSizedCertificateActive(record.validTo),
      careersUrl,
      linked: Boolean(careersUrl),
      careersDiscoveryStatus: record.careersDiscoveryStatus ?? (careersUrl ? 'found' : 'pending'),
      careersUrlCheckedAt: record.careersUrlCheckedAt ?? null,
      crawlSourceId: record.crawlSourceId,
    };
  });

  if (activeOnly) rows = rows.filter((row) => row.active);
  if (linkedOnly) rows = rows.filter((row) => row.linked);
  if (notFoundOnly) rows = rows.filter((row) => row.careersDiscoveryStatus === 'not_found');
  if (pendingOnly) rows = rows.filter((row) => row.careersDiscoveryStatus === 'pending');
  if (q) {
    rows = rows.filter((row) =>
      [row.companyName, row.businessNumber].join(' ').toLowerCase().includes(q),
    );
  }

  const total = rows.length;
  const linkedCount = uniqueCompanies.filter((record) => record.careersUrl?.trim()).length;

  let probedCount = 0;
  let notFoundCount = 0;
  let pendingCount = 0;
  for (const record of uniqueCompanies) {
    const status = record.careersDiscoveryStatus ?? (record.careersUrl ? 'found' : 'pending');
    if (status === 'not_found') {
      probedCount += 1;
      notFoundCount += 1;
    } else if (status === 'found') {
      probedCount += 1;
    } else {
      pendingCount += 1;
    }
  }

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
      uniqueCompanyCount: dbFile?.uniqueCompanyCount ?? uniqueCompanies.length,
      rawRowCount: mme.companies.length,
      activeCertificateCount: uniqueCompanies.filter((item) => isMidSizedCertificateActive(item.validTo)).length,
      probedCount,
      notFoundCount,
      pendingCount,
      targetsOnDisk: linkedCount,
    },
  });
}

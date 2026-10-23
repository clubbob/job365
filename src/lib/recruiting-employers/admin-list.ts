import { countMiscCrawlerCompanies, getRegistryMiscCrawlerCompanies } from '@/lib/crawler/companies';
import {
  activeJobCountForMidSizedCrawlSource,
  type CrawledJobSourceStats,
} from '@/lib/crawled-jobs-server';
import { loadEnterpriseRegistryDbCompanies } from '@/lib/enterprise-companies/registry-db';
import { isItComputingCompany } from '@/lib/it-companies/catalog';
import { buildItCompanyRegistryRows, registryRowDedupeKey } from '@/lib/it-companies/build-registry-rows';
import { isMidSizedCertificateActive } from '@/lib/mid-sized-companies/registry-dedupe';
import {
  loadMidSizedRegistryDbCompanies,
  type MidSizedRegistryDbCompany,
} from '@/lib/mid-sized-companies/registry-db';
import { compareMidSizedCompaniesByFame } from '@/lib/mid-sized-companies/fame-rank';
import { recruitingEmployerCountFromNormMap } from '@/lib/recruiting-employers/aggregate';
import { resolveRegistryBusinessNumber } from '@/lib/recruiting-employers/careers-url-business-number';
import type { RecruitingEmployerAdminSegment } from '@/lib/recruiting-employers/segments';

export type AdminRecruitingCompanyRow = {
  companyName: string;
  businessNumber: string;
  segmentLabel: string;
  active: boolean | null;
  careersUrl: string | null;
  linked: boolean;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
  careersUrlCheckedAt: string | null;
  activeJobCount: number;
};

function midSizedActiveJobCount(
  companyName: string,
  crawlSourceId: string,
  stats: CrawledJobSourceStats,
): number {
  const byEmployer = recruitingEmployerCountFromNormMap(stats.recruitingEmployerCountByNorm, companyName);
  const byCrawlSource = activeJobCountForMidSizedCrawlSource(crawlSourceId, stats.jobCountsBySource);
  return Math.max(byEmployer, byCrawlSource);
}

type MidSizedSortRow = AdminRecruitingCompanyRow & { crawlSourceId: string };

function midSizedRowFromRecord(
  record: MidSizedRegistryDbCompany,
  stats: CrawledJobSourceStats,
): AdminRecruitingCompanyRow {
  const careersUrl = record.careersUrl?.trim() || null;
  return {
    companyName: record.companyName,
    businessNumber: resolveRegistryBusinessNumber({
      companyName: record.companyName,
      careersUrl,
      crawlSourceId: record.crawlSourceId,
      existing: record.businessNumber,
    }),
    segmentLabel: '중견기업',
    active: isMidSizedCertificateActive(record.validTo),
    careersUrl,
    linked: Boolean(careersUrl),
    careersDiscoveryStatus: record.careersDiscoveryStatus ?? (careersUrl ? 'found' : 'pending'),
    careersUrlCheckedAt: record.careersUrlCheckedAt ?? null,
    activeJobCount: midSizedActiveJobCount(record.companyName, record.crawlSourceId, stats),
  };
}

function buildMidSizedRows(stats: CrawledJobSourceStats): AdminRecruitingCompanyRow[] {
  const registry = loadMidSizedRegistryDbCompanies();
  const rows: MidSizedSortRow[] = registry.map((record) => ({
    ...midSizedRowFromRecord(record, stats),
    crawlSourceId: record.crawlSourceId,
  }));

  rows.sort((a, b) => {
    const fame = compareMidSizedCompaniesByFame(a, b);
    if (fame !== 0) return fame;
    return b.activeJobCount - a.activeJobCount;
  });

  return rows.map(
    ({
      companyName,
      businessNumber,
      segmentLabel,
      active,
      careersUrl,
      linked,
      careersDiscoveryStatus,
      careersUrlCheckedAt,
      activeJobCount,
    }) => ({
      companyName,
      businessNumber,
      segmentLabel,
      active,
      careersUrl,
      linked,
      careersDiscoveryStatus,
      careersUrlCheckedAt,
      activeJobCount,
    }),
  );
}

function buildEnterpriseRows(stats: CrawledJobSourceStats): AdminRecruitingCompanyRow[] {
  const registry = loadEnterpriseRegistryDbCompanies();

  return [...registry]
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        (stats.jobCountsBySource[b.sourceId ?? ''] ?? 0) -
          (stats.jobCountsBySource[a.sourceId ?? ''] ?? 0),
    )
    .map((record) => {
      const careersUrl = record.careersUrl?.trim() || null;
      const linked = Boolean(careersUrl);
      const activeJobCount = record.sourceId ? stats.jobCountsBySource[record.sourceId] ?? 0 : 0;
      const discoveryStatus: AdminRecruitingCompanyRow['careersDiscoveryStatus'] = linked
        ? 'enterprise'
        : activeJobCount > 0
          ? 'found'
          : 'pending';

      return {
        companyName: record.groupName,
        businessNumber: resolveRegistryBusinessNumber({
          companyName: record.groupName,
          careersUrl,
          crawlSourceId: record.crawlSourceId,
          sourceId: record.sourceId,
        }),
        segmentLabel: '대기업·계열',
        active: null,
        careersUrl,
        linked,
        careersDiscoveryStatus: discoveryStatus,
        careersUrlCheckedAt: null,
        activeJobCount,
      };
    });
}

function buildMiscRows(stats: CrawledJobSourceStats): AdminRecruitingCompanyRow[] {
  return getRegistryMiscCrawlerCompanies()
    .map((company) => {
      const careersUrl = company.careersUrl?.trim() || null;
      const activeJobCount = stats.jobCountsBySource[company.sourceId] ?? 0;
      return {
        companyName: company.name,
        businessNumber: resolveRegistryBusinessNumber({
          companyName: company.name,
          careersUrl,
          crawlSourceId: company.id,
          sourceId: company.sourceId,
        }),
        segmentLabel: '중견 기업',
        active: null,
        careersUrl,
        linked: Boolean(careersUrl),
        careersDiscoveryStatus: 'enterprise' as const,
        careersUrlCheckedAt: null,
        activeJobCount,
      };
    })
    .sort((a, b) => b.activeJobCount - a.activeJobCount || a.companyName.localeCompare(b.companyName, 'ko'));
}

function buildItRows(stats: CrawledJobSourceStats): AdminRecruitingCompanyRow[] {
  const registryRows = buildItCompanyRegistryRows(stats.jobCountsBySource);

  return registryRows.map((row) => {
    const byEmployer = recruitingEmployerCountFromNormMap(stats.recruitingEmployerCountByNorm, row.companyName);
    const activeJobCount = Math.max(row.activeJobCount, byEmployer);
    const segmentLabel =
      row.segment === '대기업·계열'
        ? '대기업·계열'
        : row.segment === 'IT 기업'
          ? 'IT 기업'
          : '중견 기업';

    return {
      companyName: row.companyName,
      businessNumber: resolveRegistryBusinessNumber({
        companyName: row.companyName,
        careersUrl: row.careersUrl,
        crawlSourceId: row.crawlSourceId?.startsWith('mid-') ? row.crawlSourceId : null,
        sourceId: row.crawlSourceId,
        existing: row.businessNumber,
      }),
      segmentLabel,
      active: row.active,
      careersUrl: row.careersUrl,
      linked: row.linked,
      careersDiscoveryStatus: row.careersDiscoveryStatus,
      careersUrlCheckedAt: row.careersUrlCheckedAt,
      activeJobCount,
    };
  });
}

function registryCompanyKey(name: string): string {
  return registryRowDedupeKey(name);
}

const REGISTRY_SEGMENT_COUNTS_TTL_MS = 300_000;
let registrySegmentCountsCache: {
  expiresAt: number;
  counts: RecruitingCompanyActiveCounts;
} | null = null;

function computeRecruitingSegmentRegistryCounts(): RecruitingCompanyActiveCounts {
  const itRows = buildItCompanyRegistryRows({});
  const itKeys = new Set(itRows.map((row) => registryCompanyKey(row.companyName)));
  const enterprise = loadEnterpriseRegistryDbCompanies().filter(
    (record) => !itKeys.has(registryCompanyKey(record.groupName)),
  ).length;
  const mid =
    loadMidSizedRegistryDbCompanies().filter(
      (record) => !isItComputingCompany(record.companyName, record.industry),
    ).length + miscRegistryCount();
  return {
    enterprise,
    'mid-sized': mid,
    it: itRows.length,
  };
}

/** 탭·통계용 명단 규모. IT 명단에 있는 회사는 대기업·계열·중견 건수에서 뺍니다. */
export function recruitingSegmentRegistryCount(segment: RecruitingEmployerAdminSegment): number {
  if (segment === 'misc') return miscRegistryCount();
  return getRecruitingSegmentRegistryCounts()[segment];
}

function miscRegistryCount(): number {
  return countMiscCrawlerCompanies();
}

export function recruitingSegmentRegistryStatLabel(segment: RecruitingEmployerAdminSegment): string {
  if (segment === 'enterprise') return '대기업·계열';
  if (segment === 'mid-sized' || segment === 'misc') return '중견 명단';
  return 'IT 명단';
}

export function getRecruitingSegmentRegistryCounts(): RecruitingCompanyActiveCounts {
  if (
    registrySegmentCountsCache &&
    registrySegmentCountsCache.expiresAt > Date.now()
  ) {
    return registrySegmentCountsCache.counts;
  }
  const counts = computeRecruitingSegmentRegistryCounts();
  registrySegmentCountsCache = {
    expiresAt: Date.now() + REGISTRY_SEGMENT_COUNTS_TTL_MS,
    counts,
  };
  return counts;
}

export function invalidateRecruitingSegmentRegistryCountsCache(): void {
  registrySegmentCountsCache = null;
}

export { formatRecruitingRegistryCountBreakdown } from '@/lib/recruiting-employers/registry-count-format';

export function buildAdminRecruitingCompanyRows(
  segment: RecruitingEmployerAdminSegment,
  stats: CrawledJobSourceStats,
): AdminRecruitingCompanyRow[] {
  if (segment === 'mid-sized' || segment === 'misc') {
    return [...buildMidSizedRows(stats), ...buildMiscRows(stats)];
  }
  if (segment === 'it') return buildItRows(stats);
  return buildEnterpriseRows(stats);
}

export type AdminRecruitingListPageQuery = {
  offset: number;
  limit: number;
  q: string;
  jobsOnly: boolean;
};

export type AdminRecruitingListPageResult = {
  items: AdminRecruitingCompanyRow[];
  total: number;
  linkedCount: number;
  withActiveJobsCount: number;
};

function paginateAdminRows(
  rows: AdminRecruitingCompanyRow[],
  query: AdminRecruitingListPageQuery,
): AdminRecruitingListPageResult {
  let filtered = rows;
  if (query.jobsOnly) filtered = filtered.filter((row) => row.activeJobCount > 0);
  const q = query.q.trim().toLowerCase();
  if (q) filtered = filtered.filter((row) => row.companyName.toLowerCase().includes(q));

  const linkedCount = filtered.filter((row) => row.linked).length;
  const withActiveJobsCount = filtered.filter((row) => row.activeJobCount > 0).length;
  const total = filtered.length;
  const items = filtered.slice(query.offset, query.offset + query.limit);

  return { items, total, linkedCount, withActiveJobsCount };
}

function midSizedSortKey(record: MidSizedRegistryDbCompany, stats: CrawledJobSourceStats): MidSizedSortRow {
  return {
    ...midSizedRowFromRecord(record, stats),
    crawlSourceId: record.crawlSourceId,
  };
}

function buildMidSizedListPage(
  stats: CrawledJobSourceStats,
  query: AdminRecruitingListPageQuery,
): AdminRecruitingListPageResult {
  const registry = loadMidSizedRegistryDbCompanies();
  const q = query.q.trim().toLowerCase();

  let indices = registry.map((_, index) => index);
  if (q) {
    indices = indices.filter((index) => registry[index].companyName.toLowerCase().includes(q));
  }

  indices.sort((indexA, indexB) => {
    const rowA = midSizedSortKey(registry[indexA], stats);
    const rowB = midSizedSortKey(registry[indexB], stats);
    const fame = compareMidSizedCompaniesByFame(rowA, rowB);
    if (fame !== 0) return fame;
    return rowB.activeJobCount - rowA.activeJobCount;
  });

  if (query.jobsOnly) {
    indices = indices.filter(
      (index) => midSizedActiveJobCount(registry[index].companyName, registry[index].crawlSourceId, stats) > 0,
    );
  }

  let linkedCount = 0;
  let withActiveJobsCount = 0;
  for (const index of indices) {
    const record = registry[index];
    if (record.careersUrl?.trim()) linkedCount += 1;
    if (midSizedActiveJobCount(record.companyName, record.crawlSourceId, stats) > 0) {
      withActiveJobsCount += 1;
    }
  }

  const total = indices.length;
  const pageIndices = indices.slice(query.offset, query.offset + query.limit);
  const items = pageIndices.map((index) => midSizedRowFromRecord(registry[index], stats));

  return { items, total, linkedCount, withActiveJobsCount };
}

function buildEnterpriseListPage(
  stats: CrawledJobSourceStats,
  query: AdminRecruitingListPageQuery,
): AdminRecruitingListPageResult {
  const registry = [...loadEnterpriseRegistryDbCompanies()].sort(
    (a, b) =>
      a.rank - b.rank ||
      (stats.jobCountsBySource[b.sourceId ?? ''] ?? 0) - (stats.jobCountsBySource[a.sourceId ?? ''] ?? 0),
  );

  const q = query.q.trim().toLowerCase();
  let filtered = registry;
  if (q) filtered = filtered.filter((record) => record.groupName.toLowerCase().includes(q));
  if (query.jobsOnly) {
    filtered = filtered.filter((record) => (record.sourceId ? stats.jobCountsBySource[record.sourceId] ?? 0 : 0) > 0);
  }

  const linkedCount = filtered.filter((record) => Boolean(record.careersUrl?.trim())).length;
  const withActiveJobsCount = filtered.filter(
    (record) => (record.sourceId ? stats.jobCountsBySource[record.sourceId] ?? 0 : 0) > 0,
  ).length;
  const total = filtered.length;
  const slice = filtered.slice(query.offset, query.offset + query.limit);

  const items = slice.map((record) => {
    const careersUrl = record.careersUrl?.trim() || null;
    const linked = Boolean(careersUrl);
    const activeJobCount = record.sourceId ? stats.jobCountsBySource[record.sourceId] ?? 0 : 0;
    const discoveryStatus: AdminRecruitingCompanyRow['careersDiscoveryStatus'] = linked
      ? 'enterprise'
      : activeJobCount > 0
        ? 'found'
        : 'pending';

    return {
      companyName: record.groupName,
      businessNumber: resolveRegistryBusinessNumber({
        companyName: record.groupName,
        careersUrl,
        crawlSourceId: record.crawlSourceId,
        sourceId: record.sourceId,
      }),
      segmentLabel: '대기업·계열',
      active: null,
      careersUrl,
      linked,
      careersDiscoveryStatus: discoveryStatus,
      careersUrlCheckedAt: null,
      activeJobCount,
    };
  });

  return { items, total, linkedCount, withActiveJobsCount };
}

/** 목록 API — 현재 페이지 행만 만들고, 전체 명단 행은 만들지 않습니다. */
export function buildAdminRecruitingCompanyListPage(
  segment: RecruitingEmployerAdminSegment,
  stats: CrawledJobSourceStats,
  query: AdminRecruitingListPageQuery,
): AdminRecruitingListPageResult {
  if (segment === 'enterprise') return buildEnterpriseListPage(stats, query);
  if (segment === 'mid-sized' || segment === 'misc') {
    const miscRows = buildMiscRows(stats);
    if (miscRows.length === 0) return buildMidSizedListPage(stats, query);
    return paginateAdminRows([...buildMidSizedRows(stats), ...miscRows], query);
  }
  return paginateAdminRows(buildItRows(stats), query);
}

export type RecruitingCompanyActiveCounts = {
  enterprise: number;
  'mid-sized': number;
  it: number;
};

export function countRecruitingCompaniesWithActiveJobs(
  segment: RecruitingEmployerAdminSegment,
  stats: CrawledJobSourceStats,
): number {
  if (segment === 'enterprise') {
    return loadEnterpriseRegistryDbCompanies().filter(
      (record) => (record.sourceId ? stats.jobCountsBySource[record.sourceId] ?? 0 : 0) > 0,
    ).length;
  }
  if (segment === 'mid-sized' || segment === 'misc') {
    const mid =
      loadMidSizedRegistryDbCompanies().filter(
        (record) => midSizedActiveJobCount(record.companyName, record.crawlSourceId, stats) > 0,
      ).length;
    const misc = getRegistryMiscCrawlerCompanies().filter(
      (company) => (stats.jobCountsBySource[company.sourceId] ?? 0) > 0,
    ).length;
    return mid + misc;
  }
  return buildItRows(stats).filter((row) => row.activeJobCount > 0).length;
}

export function computeRecruitingCompanyActiveCounts(stats: CrawledJobSourceStats): RecruitingCompanyActiveCounts {
  return {
    enterprise: countRecruitingCompaniesWithActiveJobs('enterprise', stats),
    'mid-sized': countRecruitingCompaniesWithActiveJobs('mid-sized', stats),
    it: countRecruitingCompaniesWithActiveJobs('it', stats),
  };
}

function jobCountsFingerprint(jobCountsBySource: Record<string, number>): string {
  let sourceCount = 0;
  let jobSum = 0;
  for (const value of Object.values(jobCountsBySource)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    sourceCount += 1;
    jobSum += value;
  }
  return `${sourceCount}:${jobSum}`;
}

let cachedRowsFingerprint = '';
const cachedRowsBySegment = new Map<RecruitingEmployerAdminSegment, AdminRecruitingCompanyRow[]>();
const rowsInflightBySegment = new Map<RecruitingEmployerAdminSegment, Promise<AdminRecruitingCompanyRow[]>>();

export async function getAdminRecruitingCompanyRows(
  segment: RecruitingEmployerAdminSegment,
  stats: CrawledJobSourceStats,
): Promise<AdminRecruitingCompanyRow[]> {
  const fingerprint = jobCountsFingerprint(stats.jobCountsBySource);
  if (cachedRowsFingerprint !== fingerprint) {
    cachedRowsFingerprint = fingerprint;
    cachedRowsBySegment.clear();
    rowsInflightBySegment.clear();
  }

  const cached = cachedRowsBySegment.get(segment);
  if (cached) return cached;

  const inflight = rowsInflightBySegment.get(segment);
  if (inflight) return inflight;

  const promise = Promise.resolve().then(() => {
    const rows = buildAdminRecruitingCompanyRows(segment, stats);
    cachedRowsBySegment.set(segment, rows);
    return rows;
  });

  rowsInflightBySegment.set(segment, promise);
  try {
    return await promise;
  } finally {
    rowsInflightBySegment.delete(segment);
  }
}

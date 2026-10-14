import {
  activeJobCountForMidSizedCrawlSource,
  type CrawledJobSourceStats,
} from '@/lib/crawled-jobs-server';
import { loadEnterpriseRegistryDbCompanies } from '@/lib/enterprise-companies/registry-db';
import {
  buildItCompanyRegistryRows,
  countItCompanyRegistryRows,
} from '@/lib/it-companies/build-registry-rows';
import { isMidSizedCertificateActive } from '@/lib/mid-sized-companies/registry-dedupe';
import { loadMidSizedRegistryDbCompanies } from '@/lib/mid-sized-companies/registry-db';
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

function buildMidSizedRows(stats: CrawledJobSourceStats): AdminRecruitingCompanyRow[] {
  const registry = loadMidSizedRegistryDbCompanies();
  const rows: MidSizedSortRow[] = registry.map((record) => {
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
      crawlSourceId: record.crawlSourceId,
    };
  });

  rows.sort((a, b) => {
    const fame = compareMidSizedCompaniesByFame(a, b);
    if (fame !== 0) return fame;
    return b.activeJobCount - a.activeJobCount;
  });

  return rows.map(({ crawlSourceId: _crawlSourceId, ...row }) => row);
}

function buildEnterpriseRows(stats: CrawledJobSourceStats): AdminRecruitingCompanyRow[] {
  const registry = loadEnterpriseRegistryDbCompanies();

  return registry
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
        rank: record.rank,
      };
    })
    .sort(
      (a, b) =>
        (a as AdminRecruitingCompanyRow & { rank: number }).rank -
          (b as AdminRecruitingCompanyRow & { rank: number }).rank ||
        b.activeJobCount - a.activeJobCount,
    )
    .map(({ rank: _rank, ...row }) => row as AdminRecruitingCompanyRow);
}

function buildItRows(stats: CrawledJobSourceStats): AdminRecruitingCompanyRow[] {
  const registryRows = buildItCompanyRegistryRows(stats.jobCountsBySource);

  return registryRows.map((row) => {
    const byEmployer = recruitingEmployerCountFromNormMap(stats.recruitingEmployerCountByNorm, row.companyName);
    const activeJobCount = Math.max(row.activeJobCount, byEmployer);
    const segmentLabel =
      row.segment === '대기업·계열' ? '대기업·계열' : row.segment === '별도 등록' ? '별도 등록' : '중견기업';

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

/** 탭·통계용 명단 규모(공시 집단·중견 명단·IT 명단). 모집 회사 목록 건수와 다릅니다. */
export function recruitingSegmentRegistryCount(segment: RecruitingEmployerAdminSegment): number {
  if (segment === 'enterprise') return loadEnterpriseRegistryDbCompanies().length;
  if (segment === 'mid-sized') return loadMidSizedRegistryDbCompanies().length;
  return countItCompanyRegistryRows();
}

export function recruitingSegmentRegistryStatLabel(segment: RecruitingEmployerAdminSegment): string {
  if (segment === 'enterprise') return '대기업·계열';
  if (segment === 'mid-sized') return '중견 명단';
  return 'IT 명단';
}

export function getRecruitingSegmentRegistryCounts(): RecruitingCompanyActiveCounts {
  return {
    enterprise: recruitingSegmentRegistryCount('enterprise'),
    'mid-sized': recruitingSegmentRegistryCount('mid-sized'),
    it: recruitingSegmentRegistryCount('it'),
  };
}

export function buildAdminRecruitingCompanyRows(
  segment: RecruitingEmployerAdminSegment,
  stats: CrawledJobSourceStats,
): AdminRecruitingCompanyRow[] {
  if (segment === 'mid-sized') return buildMidSizedRows(stats);
  if (segment === 'it') return buildItRows(stats);
  return buildEnterpriseRows(stats);
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
  const rows = buildAdminRecruitingCompanyRows(segment, stats);
  return rows.filter((row) => row.activeJobCount > 0).length;
}

export function computeRecruitingCompanyActiveCounts(stats: CrawledJobSourceStats): RecruitingCompanyActiveCounts {
  return {
    enterprise: countRecruitingCompaniesWithActiveJobs('enterprise', stats),
    'mid-sized': countRecruitingCompaniesWithActiveJobs('mid-sized', stats),
    it: countRecruitingCompaniesWithActiveJobs('it', stats),
  };
}

let cachedStatsRef: CrawledJobSourceStats | null = null;
const cachedRowsBySegment = new Map<RecruitingEmployerAdminSegment, AdminRecruitingCompanyRow[]>();
const rowsInflightBySegment = new Map<RecruitingEmployerAdminSegment, Promise<AdminRecruitingCompanyRow[]>>();

export async function getAdminRecruitingCompanyRows(
  segment: RecruitingEmployerAdminSegment,
  stats: CrawledJobSourceStats,
): Promise<AdminRecruitingCompanyRow[]> {
  if (cachedStatsRef !== stats) {
    cachedStatsRef = stats;
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

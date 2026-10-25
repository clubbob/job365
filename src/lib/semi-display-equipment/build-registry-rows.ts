import type { CrawledJobSourceStats } from '@/lib/crawled-jobs-server';
import { enrichRegistryRowWithGroupAffiliate } from '@/lib/enterprise-groups/group-affiliate-registry';
import { activeJobCountForRegistryCompany } from '@/lib/recruiting-employers/registry-active-job-count';
import { compareSemiDisplayEquipmentCompaniesByFame } from '@/lib/semi-display-equipment/fame-rank';
import { semiEquipmentSeedNormalizeKey } from '@/lib/semi-display-equipment/master-seed';
import { loadSeedCareersRegistryDbCompanies } from '@/lib/seed-careers/registry-db';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { isRegistryRowLinked } from '@/lib/registry-company-identity';
import { resolveRegistryBusinessNumber } from '@/lib/recruiting-employers/careers-url-business-number';

export type SemiDisplayEquipmentRegistryRow = {
  companyName: string;
  businessNumber: string;
  segment: '반도체·디스플레이 장비사';
  active: boolean | null;
  careersUrl: string | null;
  linked: boolean;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
  careersUrlCheckedAt: string | null;
  activeJobCount: number;
  crawlSourceId: string | null;
  careersUrlNote: string | null;
};

function businessNumberForSeedRow(record: {
  companyName: string;
  businessNumber: string | null;
  careersUrl: string | null;
  crawlSourceId: string;
}): string {
  const digits = digitsOnly(record.businessNumber ?? '');
  if (digits.length === 10) return formatBusinessNumber(digits);
  return resolveRegistryBusinessNumber({
    companyName: record.companyName,
    careersUrl: record.careersUrl,
    crawlSourceId: record.crawlSourceId,
    sourceId: record.crawlSourceId,
    existing: record.businessNumber,
  });
}

function emptyRegistryStats(): CrawledJobSourceStats {
  return {
    jobCountsBySource: {},
    discoveredBySource: {},
    recruitingEmployerCountByNorm: {},
    recruitingEmployerAggregates: [],
  };
}

/** 반도체·디스플레이 장비사 명단 — `semi-seed-registry-db.json` 전용 (대기업·중견과 겹치지 않음) */
export function buildSemiDisplayEquipmentRegistryRows(
  stats: CrawledJobSourceStats | Record<string, number> = emptyRegistryStats(),
): SemiDisplayEquipmentRegistryRow[] {
  const resolvedStats: CrawledJobSourceStats =
    'jobCountsBySource' in stats && stats.jobCountsBySource
      ? (stats as CrawledJobSourceStats)
      : { ...emptyRegistryStats(), jobCountsBySource: stats as Record<string, number> };

  return loadSeedCareersRegistryDbCompanies('semi-equipment')
    .map((record) => {
      const storedCareersUrl = record.careersUrl?.trim() || null;
      const base = {
        companyName: record.companyName,
        businessNumber: businessNumberForSeedRow(record),
        segment: '반도체·디스플레이 장비사' as const,
        active: null,
        careersUrl: storedCareersUrl,
        linked: isRegistryRowLinked(record),
        careersDiscoveryStatus: record.careersDiscoveryStatus,
        careersUrlCheckedAt: record.careersUrlCheckedAt,
        activeJobCount: 0,
        crawlSourceId: isRegistryRowLinked(record) ? record.crawlSourceId : null,
        careersUrlNote: null,
      };

      const affiliate = enrichRegistryRowWithGroupAffiliate({
        companyName: base.companyName,
        careersUrl: base.careersUrl,
        linked: base.linked,
        careersDiscoveryStatus: base.careersDiscoveryStatus,
      });

      const crawlSourceId = base.crawlSourceId ?? affiliate.groupSourceId;
      const activeJobCount = activeJobCountForRegistryCompany(
        base.companyName,
        resolvedStats,
        crawlSourceId,
      );

      const resolvedCareersUrl = affiliate.careersUrl;
      return {
        ...base,
        careersUrl: resolvedCareersUrl,
        linked: isRegistryRowLinked({
          businessNumber: record.businessNumber,
          careersUrl: resolvedCareersUrl,
        }),
        careersDiscoveryStatus: affiliate.careersDiscoveryStatus,
        careersUrlNote: affiliate.careersUrlNote,
        crawlSourceId: isRegistryRowLinked({
          businessNumber: record.businessNumber,
          careersUrl: resolvedCareersUrl,
        })
          ? crawlSourceId
          : null,
        activeJobCount,
      };
    })
    .sort(compareSemiDisplayEquipmentCompaniesByFame);
}

export function registryRowDedupeKey(name: string): string {
  return semiEquipmentSeedNormalizeKey(name);
}

export function countSemiDisplayEquipmentRegistryRows(): number {
  return buildSemiDisplayEquipmentRegistryRows().length;
}

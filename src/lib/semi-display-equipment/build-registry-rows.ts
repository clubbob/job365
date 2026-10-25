import type { CrawledJobSourceStats } from '@/lib/crawled-jobs-server';
import { enrichRegistryRowWithGroupAffiliate } from '@/lib/enterprise-groups/group-affiliate-registry';
import { activeJobCountForRegistryCompany } from '@/lib/recruiting-employers/registry-active-job-count';
import { isSemiDisplayEquipmentCompany } from '@/lib/semi-display-equipment/catalog';
import { compareSemiDisplayEquipmentCompaniesByFame } from '@/lib/semi-display-equipment/fame-rank';
import { semiEquipmentSeedNormalizeKey } from '@/lib/semi-display-equipment/master-seed';
import { loadSeedCareersRegistryDbCompanies } from '@/lib/seed-careers/registry-db';
import { isMidSizedCertificateActive } from '@/lib/mid-sized-companies/registry-dedupe';
import { loadMidSizedRegistryDbCompanies } from '@/lib/mid-sized-companies/registry-db';
import { resolveRegistryBusinessNumber } from '@/lib/recruiting-employers/careers-url-business-number';

export type SemiDisplayEquipmentRegistryRow = {
  companyName: string;
  businessNumber: string;
  segment: '중견기업' | '장비·부품';
  active: boolean | null;
  careersUrl: string | null;
  linked: boolean;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
  careersUrlCheckedAt: string | null;
  activeJobCount: number;
  crawlSourceId: string | null;
  careersUrlNote: string | null;
};

function midSizedSemiRows(): SemiDisplayEquipmentRegistryRow[] {
  return loadMidSizedRegistryDbCompanies()
    .filter((record) => isSemiDisplayEquipmentCompany(record.companyName, record.industry))
    .map((record) => {
      const careersUrl = record.careersUrl?.trim() || null;
      return {
        companyName: record.companyName,
        businessNumber: resolveRegistryBusinessNumber({
          companyName: record.companyName,
          careersUrl,
          crawlSourceId: record.crawlSourceId,
          existing: record.businessNumber,
        }),
        segment: '중견기업' as const,
        active: isMidSizedCertificateActive(record.validTo),
        careersUrl,
        linked: Boolean(careersUrl),
        careersDiscoveryStatus: record.careersDiscoveryStatus ?? (careersUrl ? 'found' : 'pending'),
        careersUrlCheckedAt: record.careersUrlCheckedAt ?? null,
        activeJobCount: 0,
        crawlSourceId: record.crawlSourceId,
        careersUrlNote: null,
      };
    });
}

function seedRegistrySemiRows(): SemiDisplayEquipmentRegistryRow[] {
  return loadSeedCareersRegistryDbCompanies('semi-equipment').map((record) => ({
    companyName: record.companyName,
    businessNumber: resolveRegistryBusinessNumber({
      companyName: record.companyName,
      careersUrl: record.careersUrl,
      crawlSourceId: record.crawlSourceId,
      sourceId: record.crawlSourceId,
    }),
    segment: '장비·부품' as const,
    active: null,
    careersUrl: record.careersUrl,
    linked: Boolean(record.careersUrl),
    careersDiscoveryStatus: record.careersDiscoveryStatus,
    careersUrlCheckedAt: record.careersUrlCheckedAt,
    activeJobCount: 0,
    crawlSourceId: record.careersUrl ? record.crawlSourceId : null,
    careersUrlNote: null,
  }));
}

export function registryRowDedupeKey(name: string): string {
  return semiEquipmentSeedNormalizeKey(name);
}

function emptyRegistryStats(): CrawledJobSourceStats {
  return {
    jobCountsBySource: {},
    discoveredBySource: {},
    recruitingEmployerCountByNorm: {},
    recruitingEmployerAggregates: [],
  };
}

export function buildSemiDisplayEquipmentRegistryRows(
  stats: CrawledJobSourceStats | Record<string, number> = emptyRegistryStats(),
): SemiDisplayEquipmentRegistryRow[] {
  const resolvedStats: CrawledJobSourceStats =
    'jobCountsBySource' in stats && stats.jobCountsBySource
      ? (stats as CrawledJobSourceStats)
      : { ...emptyRegistryStats(), jobCountsBySource: stats as Record<string, number> };

  const seen = new Set<string>();
  const merged: SemiDisplayEquipmentRegistryRow[] = [];

  for (const row of [...midSizedSemiRows(), ...seedRegistrySemiRows()]) {
    const key = registryRowDedupeKey(row.companyName);
    if (seen.has(key)) continue;
    seen.add(key);

    const affiliate = enrichRegistryRowWithGroupAffiliate({
      companyName: row.companyName,
      careersUrl: row.careersUrl,
      linked: row.linked,
      careersDiscoveryStatus: row.careersDiscoveryStatus,
    });

    const crawlSourceId = row.crawlSourceId ?? affiliate.groupSourceId;
    const activeJobCount = activeJobCountForRegistryCompany(
      row.companyName,
      resolvedStats,
      crawlSourceId,
    );

    merged.push({
      ...row,
      careersUrl: affiliate.careersUrl,
      linked: affiliate.linked,
      careersDiscoveryStatus: affiliate.careersDiscoveryStatus,
      careersUrlNote: affiliate.careersUrlNote,
      crawlSourceId,
      activeJobCount,
    });
  }

  return merged.sort(compareSemiDisplayEquipmentCompaniesByFame);
}

export function countSemiDisplayEquipmentRegistryRows(): number {
  return buildSemiDisplayEquipmentRegistryRows().length;
}

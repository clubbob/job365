import { activeJobCountForMidSizedCrawlSource } from '@/lib/crawled-jobs-server';
import { compareItCompaniesByFame } from '@/lib/it-companies/fame-rank';
import { masterSeedNormalizeKey } from '@/lib/it-companies/master-seed';
import { loadSeedCareersRegistryDbCompanies } from '@/lib/seed-careers/registry-db';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { isRegistryRowLinked } from '@/lib/registry-company-identity';
import { resolveRegistryBusinessNumber } from '@/lib/recruiting-employers/careers-url-business-number';

export type ItCompanyRegistryRow = {
  companyName: string;
  businessNumber: string;
  segment: 'IT 회사';
  active: boolean | null;
  careersUrl: string | null;
  linked: boolean;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
  careersUrlCheckedAt: string | null;
  activeJobCount: number;
  crawlSourceId: string | null;
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

/** IT 회사 명단 — `it-seed-registry-db.json` 전용 (대기업·중견 명단과 겹치지 않음) */
export function buildItCompanyRegistryRows(
  jobCountsBySource: Record<string, number>,
): ItCompanyRegistryRow[] {
  return loadSeedCareersRegistryDbCompanies('it')
    .map((record) => {
      const careersUrl = record.careersUrl?.trim() || null;
      const crawlSourceId =
        isRegistryRowLinked(record) ? record.crawlSourceId : null;
      const activeJobCount =
        crawlSourceId && crawlSourceId.startsWith('mid-')
          ? activeJobCountForMidSizedCrawlSource(crawlSourceId, jobCountsBySource)
          : crawlSourceId
            ? jobCountsBySource[`${crawlSourceId}-careers`] ??
              jobCountsBySource[crawlSourceId] ??
              0
            : 0;

      return {
        companyName: record.companyName,
        businessNumber: businessNumberForSeedRow(record),
        segment: 'IT 회사' as const,
        active: null,
        careersUrl,
        linked: isRegistryRowLinked(record),
        careersDiscoveryStatus: record.careersDiscoveryStatus,
        careersUrlCheckedAt: record.careersUrlCheckedAt,
        activeJobCount,
        crawlSourceId,
      };
    })
    .sort(compareItCompaniesByFame);
}

export function registryRowDedupeKey(name: string): string {
  return masterSeedNormalizeKey(name);
}

export function countItCompanyRegistryRows(): number {
  return buildItCompanyRegistryRows({}).length;
}

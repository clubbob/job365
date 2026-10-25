import {
  dedupeRegistryRowsByBusinessNumberAndUrl,
  isCompleteRegistryCompanyIdentity,
} from '@/lib/registry-company-identity';
import { loadSeedCareersRegistryDbCompanies } from '@/lib/seed-careers/registry-db';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';

export type SeedCareersCrawlConfig = {
  name: string;
  crawlSourceId: string;
  careersUrl: string;
  adapter: 'generic' | 'greenhouse';
  greenhouseBoard: string | null;
};

export function getSeedCareersCrawlConfigs(segment: SeedCareersSegment): SeedCareersCrawlConfig[] {
  const mapped = loadSeedCareersRegistryDbCompanies(segment)
    .filter((record) => isCompleteRegistryCompanyIdentity(record))
    .map((record) => ({
      name: record.companyName,
      businessNumber: record.businessNumber,
      crawlSourceId: record.crawlSourceId,
      careersUrl: record.careersUrl!.trim(),
      adapter: record.careersAdapter ?? 'generic',
      greenhouseBoard: record.greenhouseBoard ?? null,
    }));
  return dedupeRegistryRowsByBusinessNumberAndUrl(mapped).rows.map(
    ({ businessNumber: _bn, ...config }) => config,
  );
}

export function countSeedCareersCrawlConfigs(segment: SeedCareersSegment): number {
  return getSeedCareersCrawlConfigs(segment).length;
}

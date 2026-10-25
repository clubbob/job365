import { companyLabelsMatch } from '@/lib/crawler/company-name-match';
import { isStorableCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';
import {
  loadMidSizedRegistryDbCompanies,
  type MidSizedRegistryDbCompany,
} from '@/lib/mid-sized-companies/registry-db';
import { seedCareersNormalizeKey } from '@/lib/seed-careers/normalize-key';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';

function midSizedNameKey(name: string): string {
  return name
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .trim()
    .toLowerCase();
}

export type SeedMidSizedBridgeHit = {
  registryCompanyName: string;
  businessNumber: string | null;
  careersUrl: string | null;
  crawlSourceId: string;
  midSizedCompanyName: string;
};

function toBridgeHit(record: MidSizedRegistryDbCompany): SeedMidSizedBridgeHit {
  const digits = digitsOnly(record.businessNumber);
  const businessNumber = digits.length === 10 ? formatBusinessNumber(digits) : null;
  const careersUrl =
    record.careersUrl?.trim() && isStorableCareersUrl(record.careersUrl) ? record.careersUrl.trim() : null;
  return {
    registryCompanyName: record.companyName.trim(),
    businessNumber,
    careersUrl,
    crawlSourceId: record.crawlSourceId,
    midSizedCompanyName: record.companyName,
  };
}

/** 시드 표시명과 중견 명단을 정규화 키·별칭으로 연결합니다. */
export function findMidSizedBridgeForSeedCompany(
  segment: SeedCareersSegment,
  seedCompanyName: string,
): SeedMidSizedBridgeHit | null {
  const seedKey = seedCareersNormalizeKey(segment, seedCompanyName);
  if (!seedKey || seedKey.length < 2) return null;

  const companies = loadMidSizedRegistryDbCompanies();
  const exact = companies.find((row) => midSizedNameKey(row.companyName) === seedKey);
  if (exact) return toBridgeHit(exact);

  const labelMatches = companies.filter((row) => companyLabelsMatch(row.companyName, seedCompanyName));
  if (labelMatches.length === 1) return toBridgeHit(labelMatches[0]);

  if (seedKey.length < 4) return null;

  const fuzzy = companies.filter((row) => {
    const midKey = midSizedNameKey(row.companyName);
    if (!midKey) return false;
    if (midKey === seedKey) return true;
    if (midKey.includes(seedKey) || seedKey.includes(midKey)) return true;
    return false;
  });

  if (fuzzy.length === 1) return toBridgeHit(fuzzy[0]);
  return null;
}

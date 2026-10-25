import { readFileSync, writeFileSync } from 'node:fs';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { isStorableCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';
import { listSeedCareersCompanyNames } from '@/lib/seed-careers/company-names';
import { loadSeedCareersCrawlTargets } from '@/lib/seed-careers/crawl-targets';
import { seedCareersCrawlSourceId } from '@/lib/seed-careers/crawl-source-id';
import { loadSeedCareersDiscoveryState } from '@/lib/seed-careers/discovery-state';
import { seedCareersNormalizeKey } from '@/lib/seed-careers/normalize-key';
import { seedCareersRegistryDbPath } from '@/lib/seed-careers/paths';
import { loadSeedCareersRegistryOverrides } from '@/lib/seed-careers/registry-overrides';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';
import type { SeedCareersDbCompany, SeedCareersRegistryDbFile, SeedCareersTarget } from '@/lib/seed-careers/types';

function indexTargetsByName(targets: SeedCareersTarget[]): Map<string, SeedCareersTarget> {
  const map = new Map<string, SeedCareersTarget>();
  for (const target of targets) {
    const key = target.name.trim();
    if (key) map.set(key, target);
  }
  return map;
}

export function buildSeedCareersRegistryDbCompanies(segment: SeedCareersSegment): SeedCareersDbCompany[] {
  const names = listSeedCareersCompanyNames(segment);
  const targets = loadSeedCareersCrawlTargets(segment);
  const byExactName = indexTargetsByName(targets);
  const byNorm = new Map<string, SeedCareersTarget>();
  for (const target of targets) {
    const norm = seedCareersNormalizeKey(segment, target.name);
    if (norm) byNorm.set(norm, target);
  }
  const discovery = loadSeedCareersDiscoveryState(segment);
  const overrides = loadSeedCareersRegistryOverrides(segment);
  const now = new Date().toISOString();

  return names.map((companyName) => {
    const override = overrides.get(companyName.trim());
    const displayName = override?.registryCompanyName ?? companyName;

    const norm = seedCareersNormalizeKey(segment, companyName);
    const target = byExactName.get(companyName.trim()) ?? (norm ? byNorm.get(norm) : undefined);
    const discovered = norm ? discovery.entries[norm] : undefined;

    const rawCareersUrl =
      (override?.careersUrl ?? target?.careersUrl ?? discovered?.careersUrl ?? '').trim() || null;
    const careersUrl =
      rawCareersUrl && isStorableCareersUrl(rawCareersUrl) ? rawCareersUrl : null;

    const crawlSourceId = target?.crawlSourceId ?? seedCareersCrawlSourceId(segment, companyName);
    const careersAdapter = target?.adapter === 'greenhouse' ? 'greenhouse' : 'generic';
    const greenhouseBoard = target?.greenhouseBoard ?? null;

    let careersDiscoveryStatus: SeedCareersDbCompany['careersDiscoveryStatus'] = 'pending';
    let careersUrlCheckedAt: string | null = discovered?.checkedAt ?? null;
    if (careersUrl) {
      careersDiscoveryStatus = 'found';
      careersUrlCheckedAt = careersUrlCheckedAt ?? now;
    } else if (discovered?.status === 'not_found') {
      careersDiscoveryStatus = 'not_found';
      careersUrlCheckedAt = discovered.checkedAt;
    }

    const businessNumber =
      override?.businessNumber ?? target?.businessNumber ?? null;

    return {
      companyName: displayName,
      businessNumber,
      crawlSourceId,
      careersUrl,
      careersAdapter,
      greenhouseBoard,
      careersDiscoveryStatus,
      careersUrlCheckedAt,
    };
  });
}

export function buildSeedCareersRegistryDbFile(segment: SeedCareersSegment): SeedCareersRegistryDbFile {
  const companies = buildSeedCareersRegistryDbCompanies(segment);
  const linked = companies.filter((item) => item.careersUrl).length;
  const label = segment === 'it' ? 'IT 시드' : '반도체·디스플레이 장비 시드';
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    segment,
    sourceNote: `${label} 전용 명단 DB. 회사마다 고유 사업자번호·전용 채용 URL이 있어야 수집 대상입니다.`,
    uniqueCompanyCount: companies.length,
    careersUrlLinkedCount: linked,
    companies,
  };
}

export function saveSeedCareersRegistryDbToDisk(segment: SeedCareersSegment, file: SeedCareersRegistryDbFile): void {
  writeFileSync(seedCareersRegistryDbPath(segment), stringifyJsonSafe(file), 'utf8');
}

export function loadSeedCareersRegistryDbFromDisk(
  segment: SeedCareersSegment,
): SeedCareersRegistryDbFile | null {
  try {
    const raw = JSON.parse(readFileSync(seedCareersRegistryDbPath(segment), 'utf8')) as SeedCareersRegistryDbFile;
    if (raw?.version !== 1 || !Array.isArray(raw.companies)) return null;
    return raw;
  } catch {
    return null;
  }
}

/** 관리자 명단 — 디스크 DB가 있으면 사용, 없으면 targets·discovery로 합성 */
export function loadSeedCareersRegistryDbCompanies(segment: SeedCareersSegment): SeedCareersDbCompany[] {
  const fromDisk = loadSeedCareersRegistryDbFromDisk(segment);
  if (fromDisk) {
    return fromDisk.companies.map((row) => ({
      ...row,
      businessNumber: row.businessNumber ?? null,
    }));
  }
  return buildSeedCareersRegistryDbCompanies(segment);
}

export function getSeedCareersRegistryCompanyMap(
  segment: SeedCareersSegment,
): Map<string, SeedCareersDbCompany> {
  const map = new Map<string, SeedCareersDbCompany>();
  for (const row of loadSeedCareersRegistryDbCompanies(segment)) {
    const key = seedCareersNormalizeKey(segment, row.companyName);
    if (key) map.set(key, row);
  }
  return map;
}

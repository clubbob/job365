import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildEnterpriseRegistryDbFile,
  loadEnterpriseRegistryDbFromDisk,
  saveEnterpriseRegistryDbToDisk,
} from '@/lib/enterprise-companies/registry-db';
import { classifyCareersUrlRobotsAccess } from '@/lib/crawler/robots';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import {
  invalidateMidSizedRegistryDbCache,
  loadMidSizedRegistryDbFromDisk,
  saveMidSizedRegistryDbToDisk,
  type MidSizedRegistryDbFile,
} from '@/lib/mid-sized-companies/registry-db';
import {
  loadSeedCareersRegistryDbFromDisk,
  saveSeedCareersRegistryDbToDisk,
} from '@/lib/seed-careers/registry-db';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';

const REMOVED_PATH = resolve(process.cwd(), 'data/robots-blocked-extraction.json');
const MID_SIZED_TARGETS_PATH = resolve(process.cwd(), 'data/mid-sized-crawl-targets.json');

export type RobotsBlockedExtractionEntry = {
  crawlSourceId: string;
  companyName: string;
  careersUrl: string;
  removedAt: string;
};

type RobotsRemovedFromRegistryFile = {
  version: 1;
  updatedAt: string;
  sourceNote: string;
  entries: RobotsBlockedExtractionEntry[];
};

let removedIdCache: Set<string> | null = null;

export function normalizeCrawlSourceIdForBlock(raw: string): string {
  return raw.trim().replace(/-careers$/i, '');
}

function loadRemovedFile(): RobotsRemovedFromRegistryFile {
  try {
    const raw = JSON.parse(readFileSync(REMOVED_PATH, 'utf8')) as RobotsRemovedFromRegistryFile;
    if (raw?.version === 1 && Array.isArray(raw.entries)) return raw;
  } catch {
    // fall through
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    sourceNote:
      'robots.txt로 수집 불가 판정 후 수집 대상 명단 DB에서 삭제한 이력입니다. `data/*-registry-db.json`을 커밋해야 배포에 반영됩니다.',
    entries: [],
  };
}

function saveRemovedFile(file: RobotsRemovedFromRegistryFile): void {
  file.updatedAt = new Date().toISOString();
  writeFileSync(REMOVED_PATH, stringifyJsonSafe(file), 'utf8');
  removedIdCache = null;
}

/** 기타기업(코드 고정) 등 명단 DB 밖 소스용 — 이미 DB에서 지운 crawlSourceId */
export function loadRobotsBlockedCrawlSourceIds(): Set<string> {
  if (removedIdCache) return removedIdCache;
  const ids = new Set<string>();
  for (const entry of loadRemovedFile().entries) {
    const id = normalizeCrawlSourceIdForBlock(entry.crawlSourceId);
    if (id) ids.add(id);
  }
  removedIdCache = ids;
  return ids;
}

export function isExtractionBlockedForRobots(crawlSourceId: string): boolean {
  return loadRobotsBlockedCrawlSourceIds().has(normalizeCrawlSourceIdForBlock(crawlSourceId));
}

function recomputeMidSizedCounts(file: MidSizedRegistryDbFile): void {
  file.uniqueCompanyCount = file.companies.length;
  file.careersUrlLinkedCount = file.companies.filter((row) => row.careersUrl?.trim()).length;
}

function removeMidSizedRegistryCompany(crawlSourceId: string): boolean {
  const file = loadMidSizedRegistryDbFromDisk();
  if (!file) return false;
  const id = normalizeCrawlSourceIdForBlock(crawlSourceId);
  const before = file.companies.length;
  file.companies = file.companies.filter(
    (row) => normalizeCrawlSourceIdForBlock(row.crawlSourceId) !== id,
  );
  if (file.companies.length === before) return false;
  recomputeMidSizedCounts(file);
  saveMidSizedRegistryDbToDisk(file);
  invalidateMidSizedRegistryDbCache();
  return true;
}

function removeSeedRegistryCompany(segment: SeedCareersSegment, crawlSourceId: string): boolean {
  const file = loadSeedCareersRegistryDbFromDisk(segment);
  if (!file) return false;
  const id = normalizeCrawlSourceIdForBlock(crawlSourceId);
  const before = file.companies.length;
  file.companies = file.companies.filter(
    (row) => normalizeCrawlSourceIdForBlock(row.crawlSourceId) !== id,
  );
  if (file.companies.length === before) return false;
  file.uniqueCompanyCount = file.companies.length;
  file.careersUrlLinkedCount = file.companies.filter((row) => row.careersUrl?.trim()).length;
  saveSeedCareersRegistryDbToDisk(segment, file);
  return true;
}

function removeEnterpriseRegistryCompany(crawlSourceId: string): boolean {
  let file = loadEnterpriseRegistryDbFromDisk();
  if (!file) {
    file = buildEnterpriseRegistryDbFile();
  }
  const id = normalizeCrawlSourceIdForBlock(crawlSourceId);
  const before = file.companies.length;
  file.companies = file.companies.filter(
    (row) => normalizeCrawlSourceIdForBlock(row.crawlSourceId ?? '') !== id,
  );
  if (file.companies.length === before) return false;
  file.companyCount = file.companies.length;
  file.careersUrlLinkedCount = file.companies.filter((row) => row.careersUrl?.trim()).length;
  saveEnterpriseRegistryDbToDisk(file);
  return true;
}

function removeMidSizedCrawlTarget(crawlSourceId: string): boolean {
  try {
    const raw = JSON.parse(readFileSync(MID_SIZED_TARGETS_PATH, 'utf8')) as {
      version?: number;
      targets?: Array<{ crawlSourceId?: string }>;
    };
    if (!raw?.targets || !Array.isArray(raw.targets)) return false;
    const id = normalizeCrawlSourceIdForBlock(crawlSourceId);
    const before = raw.targets.length;
    raw.targets = raw.targets.filter(
      (target) => normalizeCrawlSourceIdForBlock(String(target.crawlSourceId ?? '')) !== id,
    );
    if (raw.targets.length === before) return false;
    writeFileSync(MID_SIZED_TARGETS_PATH, stringifyJsonSafe(raw), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function registerRemovedEntry(entry: RobotsBlockedExtractionEntry): boolean {
  const file = loadRemovedFile();
  const id = normalizeCrawlSourceIdForBlock(entry.crawlSourceId);
  if (file.entries.some((row) => normalizeCrawlSourceIdForBlock(row.crawlSourceId) === id)) {
    return false;
  }
  file.entries.push({
    ...entry,
    crawlSourceId: id,
    removedAt: entry.removedAt || new Date().toISOString(),
  });
  saveRemovedFile(file);
  return true;
}

/** robots 불허 — 수집 대상 명단 DB에서 회사 행을 삭제합니다. */
export async function excludeCompanyExtractionForRobots(input: {
  crawlSourceId: string;
  careersUrl: string;
  companyName?: string;
}): Promise<boolean> {
  const access = await classifyCareersUrlRobotsAccess(input.careersUrl);
  if (access !== 'blocked') return false;

  const crawlSourceId = normalizeCrawlSourceIdForBlock(input.crawlSourceId);
  const companyName = input.companyName?.trim() || crawlSourceId;

  const removedFromDb =
    removeMidSizedRegistryCompany(crawlSourceId) ||
    removeSeedRegistryCompany('it', crawlSourceId) ||
    removeSeedRegistryCompany('semi-equipment', crawlSourceId) ||
    removeEnterpriseRegistryCompany(crawlSourceId);

  removeMidSizedCrawlTarget(crawlSourceId);

  registerRemovedEntry({
    crawlSourceId,
    companyName,
    careersUrl: input.careersUrl.trim(),
    removedAt: new Date().toISOString(),
  });

  return removedFromDb || isExtractionBlockedForRobots(crawlSourceId);
}

export async function skipRegistryRecordForRobots(record: {
  crawlSourceId: string;
  careersUrl: string;
  companyName: string;
}): Promise<boolean> {
  if (isExtractionBlockedForRobots(record.crawlSourceId)) return true;
  const access = await classifyCareersUrlRobotsAccess(record.careersUrl);
  if (access === 'blocked') {
    await excludeCompanyExtractionForRobots(record);
    return true;
  }
  return false;
}

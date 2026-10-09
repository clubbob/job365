import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadDiscoveryState } from '@/lib/mid-sized-companies/discovery-state';
import { loadMidSizedCrawlTargets } from '@/lib/mid-sized-companies/crawl-targets';
import { loadMidSizedRegistryFromDisk } from '@/lib/mid-sized-companies-server';
import {
  dedupeMidSizedCompanies,
  normalizeBusinessNumber,
} from '@/lib/mid-sized-companies/registry-dedupe';
import {
  isAcceptableCareersUrl,
  isStorableCareersUrl,
} from '@/lib/mid-sized-companies/careers-url-policy';
import type { MidSizedCareersConfig, MidSizedCompanyRecord } from '@/lib/mid-sized-companies/types';

export const MID_SIZED_REGISTRY_DB_PATH = resolve(process.cwd(), 'data/mid-sized-registry-db.json');

export type MidSizedRegistryDbCompany = MidSizedCompanyRecord & {
  crawlSourceId: string;
  careersUrl: string | null;
  careersAdapter: 'generic' | 'greenhouse';
  greenhouseBoard: string | null;
};

export type MidSizedRegistryDbFile = {
  version: 1;
  updatedAt: string;
  sourceNote: string;
  uniqueCompanyCount: number;
  careersUrlLinkedCount: number;
  /** 공식 채용 사이트만(포털 제외) */
  careersUrlOfficialCount?: number;
  companies: MidSizedRegistryDbCompany[];
};

function crawlSourceIdFor(businessNumber: string, companyName: string): string {
  const digits = normalizeBusinessNumber(businessNumber);
  if (digits) return `mid-${digits}`;
  return `mid-name-${companyName}`.replace(/\s+/g, '-').slice(0, 80);
}

function normalizeNameKey(name: string): string {
  return name
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .trim()
    .toLowerCase();
}

function indexTargetsByBusinessNumber(targets: MidSizedCareersConfig[]): Map<string, MidSizedCareersConfig> {
  const map = new Map<string, MidSizedCareersConfig>();
  for (const target of targets) {
    const bn = target.businessNumber?.replace(/\D/g, '') ?? '';
    if (bn) map.set(bn, target);
  }
  return map;
}

function indexTargetsByName(targets: MidSizedCareersConfig[]): Map<string, MidSizedCareersConfig> {
  const map = new Map<string, MidSizedCareersConfig>();
  for (const target of targets) {
    const key = normalizeNameKey(target.name);
    if (key) map.set(key, target);
  }
  return map;
}

/** 마당 명단(회사 정보만) + 자동 탐색·수동 보강 채용 URL을 합쳐 중견기업 DB 레코드를 만듭니다. */
export function buildMidSizedRegistryDbCompanies(): MidSizedRegistryDbCompany[] {
  const registry = loadMidSizedRegistryFromDisk();
  const unique = dedupeMidSizedCompanies(registry.companies);
  const targets = loadMidSizedCrawlTargets();
  const byBn = indexTargetsByBusinessNumber(targets);
  const byName = indexTargetsByName(targets);
  const discovery = loadDiscoveryState();
  const now = new Date().toISOString();

  return unique.map((record) => {
    const bn = normalizeBusinessNumber(record.businessNumber);
    const target = (bn && byBn.get(bn)) || byName.get(normalizeNameKey(record.companyName));
    const discovered = bn ? discovery.entries[bn] : undefined;

    const rawCareersUrl =
      (target?.careersUrl ?? record.careersUrl ?? discovered?.careersUrl ?? '').trim() || null;
    const careersUrl =
      rawCareersUrl && isStorableCareersUrl(rawCareersUrl) ? rawCareersUrl : null;
    const crawlSourceId = target?.crawlSourceId ?? crawlSourceIdFor(record.businessNumber, record.companyName);
    const careersAdapter = target?.adapter === 'greenhouse' ? 'greenhouse' : 'generic';
    const greenhouseBoard = target?.greenhouseBoard ?? null;

    let careersDiscoveryStatus = record.careersDiscoveryStatus ?? discovered?.status ?? 'pending';
    let careersUrlCheckedAt = record.careersUrlCheckedAt ?? discovered?.checkedAt ?? null;
    if (careersUrl) {
      careersDiscoveryStatus = 'found';
      careersUrlCheckedAt = careersUrlCheckedAt ?? now;
    } else if (discovered?.status === 'not_found') {
      careersDiscoveryStatus = 'not_found';
      careersUrlCheckedAt = discovered.checkedAt;
    }

    return {
      ...record,
      careersUrl,
      crawlSourceId,
      careersAdapter,
      greenhouseBoard,
      careersDiscoveryStatus,
      careersUrlCheckedAt,
    };
  });
}

export function buildMidSizedRegistryDbFile(): MidSizedRegistryDbFile {
  const companies = buildMidSizedRegistryDbCompanies();
  const linked = companies.filter((item) => item.careersUrl).length;
  const official = companies.filter((item) => item.careersUrl && isAcceptableCareersUrl(item.careersUrl)).length;
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    sourceNote:
      '마당=회사명·사업자번호 명단만 · 채용 URL=preprocess 탐색 결과(DB, 대기업 enterprise-careers-urls와 동일 역할)',
    uniqueCompanyCount: companies.length,
    careersUrlLinkedCount: linked,
    careersUrlOfficialCount: official,
    companies,
  };
}

export function saveMidSizedRegistryDbToDisk(file: MidSizedRegistryDbFile): void {
  writeFileSync(MID_SIZED_REGISTRY_DB_PATH, `${JSON.stringify(file)}\n`, 'utf8');
}

export function loadMidSizedRegistryDbFromDisk(): MidSizedRegistryDbFile | null {
  try {
    const raw = JSON.parse(readFileSync(MID_SIZED_REGISTRY_DB_PATH, 'utf8')) as MidSizedRegistryDbFile;
    if (raw?.version === 1 && Array.isArray(raw.companies)) return raw;
  } catch {
    // 없으면 빌드 시 생성
  }
  return null;
}

export function loadMidSizedRegistryDbCompanies(): MidSizedRegistryDbCompany[] {
  const file = loadMidSizedRegistryDbFromDisk();
  if (file && file.companies.length > 0) return file.companies;
  return buildMidSizedRegistryDbCompanies();
}

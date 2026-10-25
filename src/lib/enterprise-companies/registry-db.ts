import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENTERPRISE_CAREERS_CONFIGS } from '@/lib/crawler/enterprise-careers-urls';
import { getFtcEnterpriseGroups } from '@/lib/enterprise-groups';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { IT_ENTERPRISE_CRAWL_SOURCE_IDS } from '@/lib/it-companies/catalog';
import { isReservedEnterpriseGroupForItOrSemi } from '@/lib/registry-segment-membership';

export const ENTERPRISE_REGISTRY_DB_PATH = resolve(process.cwd(), 'data/enterprise-registry-db.json');

export type EnterpriseRegistryDbCompany = {
  rank: number;
  groupName: string;
  owner: string;
  affiliateCount: number;
  crawlSourceId: string | null;
  /** active 공고 집계용 sourceId (`{crawlSourceId}-careers`) */
  sourceId: string | null;
  careersUrl: string | null;
  /** 집단 대표·채용 페이지에서 확인한 사업자등록번호 */
  businessNumber: string | null;
};

function filterEnterpriseRegistryForSegmentDb(
  companies: EnterpriseRegistryDbCompany[],
): EnterpriseRegistryDbCompany[] {
  return companies.filter((row) => {
    if (row.crawlSourceId && IT_ENTERPRISE_CRAWL_SOURCE_IDS.has(row.crawlSourceId)) {
      return false;
    }
    return !isReservedEnterpriseGroupForItOrSemi(row.groupName);
  });
}

export type EnterpriseRegistryDbFile = {
  version: 1;
  updatedAt: string;
  sourceNote: string;
  companyCount: number;
  careersUrlLinkedCount: number;
  companies: EnterpriseRegistryDbCompany[];
};

/** 공시 집단 + 채용 URL 설정을 합쳐 명단을 만듭니다(자동 갱신·수집 결과 반영 없음). */
export function buildEnterpriseRegistryDbCompanies(): EnterpriseRegistryDbCompany[] {
  const configByFtcName = new Map(ENTERPRISE_CAREERS_CONFIGS.map((item) => [item.ftcName, item]));
  const existingByGroup = new Map(
    (loadEnterpriseRegistryDbFromDisk()?.companies ?? []).map((row) => [row.groupName, row]),
  );

  const rows = getFtcEnterpriseGroups().map((group) => {
    const config = configByFtcName.get(group.name);
    const prior = existingByGroup.get(group.name);
    const crawlSourceId = group.crawlSourceId ?? config?.crawlSourceId ?? null;
    const sourceId = crawlSourceId ? `${crawlSourceId}-careers` : null;
    const careersUrl = config?.careersUrl?.trim() || prior?.careersUrl?.trim() || null;

    return {
      rank: group.rank,
      groupName: group.name,
      owner: group.owner,
      affiliateCount: group.affiliateCount,
      crawlSourceId,
      sourceId,
      careersUrl,
      businessNumber: prior?.businessNumber ?? null,
    };
  });
  return filterEnterpriseRegistryForSegmentDb(rows);
}

export function buildEnterpriseRegistryDbFile(): EnterpriseRegistryDbFile {
  const companies = buildEnterpriseRegistryDbCompanies();
  const linked = companies.filter((item) => item.careersUrl).length;
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    sourceNote:
      '대기업 명단 DB. 집단마다 고유 사업자번호·전용 채용 URL이 있어야 수집 대상입니다.',
    companyCount: companies.length,
    careersUrlLinkedCount: linked,
    companies,
  };
}

export function saveEnterpriseRegistryDbToDisk(file: EnterpriseRegistryDbFile): void {
  writeFileSync(ENTERPRISE_REGISTRY_DB_PATH, stringifyJsonSafe(file), 'utf8');
  cachedEnterpriseRegistryCompanies = null;
}

export function loadEnterpriseRegistryDbFromDisk(): EnterpriseRegistryDbFile | null {
  try {
    const raw = JSON.parse(readFileSync(ENTERPRISE_REGISTRY_DB_PATH, 'utf8')) as EnterpriseRegistryDbFile;
    if (raw?.version === 1 && Array.isArray(raw.companies)) return raw;
  } catch {
    // 최초 실행 시 생성
  }
  return null;
}

let cachedEnterpriseRegistryCompanies: EnterpriseRegistryDbCompany[] | null = null;

/** 관리자·수집에서 쓰는 대기업 고정 명단(디스크 우선, 없으면 1회 생성). */
export function loadEnterpriseRegistryDbCompanies(): EnterpriseRegistryDbCompany[] {
  if (cachedEnterpriseRegistryCompanies) return cachedEnterpriseRegistryCompanies;

  const file = loadEnterpriseRegistryDbFromDisk();
  if (file && file.companies.length > 0) {
    cachedEnterpriseRegistryCompanies = filterEnterpriseRegistryForSegmentDb(
      file.companies.map((row) => ({
        ...row,
        businessNumber: row.businessNumber ?? null,
      })),
    );
    return cachedEnterpriseRegistryCompanies;
  }

  const built = buildEnterpriseRegistryDbFile();
  saveEnterpriseRegistryDbToDisk(built);
  cachedEnterpriseRegistryCompanies = built.companies;
  return built.companies;
}

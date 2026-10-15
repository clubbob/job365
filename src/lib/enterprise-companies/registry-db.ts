import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENTERPRISE_CAREERS_CONFIGS } from '@/lib/crawler/enterprise-careers-urls';
import { getFtcEnterpriseGroups } from '@/lib/enterprise-groups';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';

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
};

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

  return getFtcEnterpriseGroups().map((group) => {
    const config = configByFtcName.get(group.name);
    const crawlSourceId = group.crawlSourceId ?? config?.crawlSourceId ?? null;
    const sourceId = crawlSourceId ? `${crawlSourceId}-careers` : null;
    const careersUrl = config?.careersUrl?.trim() || null;

    return {
      rank: group.rank,
      groupName: group.name,
      owner: group.owner,
      affiliateCount: group.affiliateCount,
      crawlSourceId,
      sourceId,
      careersUrl,
    };
  });
}

export function buildEnterpriseRegistryDbFile(): EnterpriseRegistryDbFile {
  const companies = buildEnterpriseRegistryDbCompanies();
  const linked = companies.filter((item) => item.careersUrl).length;
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    sourceNote:
      '공정거래위원회 공시대상 기업집단 + enterprise-careers-urls 채용 URL. 수집 공고 제목과 무관하게 고정 명단입니다.',
    companyCount: companies.length,
    careersUrlLinkedCount: linked,
    companies,
  };
}

export function saveEnterpriseRegistryDbToDisk(file: EnterpriseRegistryDbFile): void {
  writeFileSync(ENTERPRISE_REGISTRY_DB_PATH, stringifyJsonSafe(file), 'utf8');
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

/** 관리자·수집에서 쓰는 대기업·계열 고정 명단(디스크 우선, 없으면 1회 생성). */
export function loadEnterpriseRegistryDbCompanies(): EnterpriseRegistryDbCompany[] {
  if (cachedEnterpriseRegistryCompanies) return cachedEnterpriseRegistryCompanies;

  const file = loadEnterpriseRegistryDbFromDisk();
  if (file && file.companies.length > 0) {
    cachedEnterpriseRegistryCompanies = file.companies;
    return file.companies;
  }

  const built = buildEnterpriseRegistryDbFile();
  saveEnterpriseRegistryDbToDisk(built);
  cachedEnterpriseRegistryCompanies = built.companies;
  return built.companies;
}

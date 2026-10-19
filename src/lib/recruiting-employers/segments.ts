import { getCrawlerCompanies } from '@/lib/crawler/companies';
import { companyLabelsMatch, normalizeCompanyLabel } from '@/lib/crawler/company-name-match';
import { getFtcEnterpriseGroups } from '@/lib/enterprise-groups';
import { isItComputingCompany, isItComputingCompanyName } from '@/lib/it-companies/catalog';
import {
  loadMidSizedRegistryDbCompanies,
  type MidSizedRegistryDbCompany,
} from '@/lib/mid-sized-companies/registry-db';
import type { RecruitingEmployerAggregate } from '@/lib/recruiting-employers/aggregate';

export type RecruitingEmployerAdminSegment = 'enterprise' | 'mid-sized' | 'misc' | 'it';

export type MidSizedRegistryRecordView = {
  companyName: string;
  businessNumber: string;
  industry: string | null;
  validTo: string | null;
  careersUrl: string | null;
  careersDiscoveryStatus: MidSizedRegistryDbCompany['careersDiscoveryStatus'];
  careersUrlCheckedAt: string | null;
  crawlSourceId: string;
};

type MidSizedRegistryIndex = {
  companies: MidSizedRegistryRecordView[];
  byNorm: Map<string, MidSizedRegistryRecordView>;
  lookupCache: Map<string, MidSizedRegistryRecordView | null>;
};

let midSizedRegistryIndex: MidSizedRegistryIndex | null = null;

function toRegistryView(record: MidSizedRegistryDbCompany): MidSizedRegistryRecordView {
  return {
    companyName: record.companyName,
    businessNumber: record.businessNumber,
    industry: record.industry,
    validTo: record.validTo,
    careersUrl: record.careersUrl?.trim() || null,
    careersDiscoveryStatus: record.careersDiscoveryStatus,
    careersUrlCheckedAt: record.careersUrlCheckedAt ?? null,
    crawlSourceId: record.crawlSourceId,
  };
}

function getMidSizedRegistryIndex(): MidSizedRegistryIndex {
  if (midSizedRegistryIndex) return midSizedRegistryIndex;

  const companies = loadMidSizedRegistryDbCompanies().map(toRegistryView);
  const byNorm = new Map<string, MidSizedRegistryRecordView>();
  for (const row of companies) {
    const key = normalizeCompanyLabel(row.companyName);
    if (key && !byNorm.has(key)) byNorm.set(key, row);
  }

  midSizedRegistryIndex = { companies, byNorm, lookupCache: new Map() };
  return midSizedRegistryIndex;
}

/** 중견 명단 정규화 키(대량 제외·매칭용) */
export function getMidSizedRegistryNormKeys(): ReadonlySet<string> {
  return new Set(getMidSizedRegistryIndex().byNorm.keys());
}

export function isMidSizedRegistryEmployerNorm(companyName: string): boolean {
  const key = normalizeCompanyLabel(companyName);
  return Boolean(key && getMidSizedRegistryIndex().byNorm.has(key));
}

export function findMidSizedRegistryRecord(companyName: string): MidSizedRegistryRecordView | undefined {
  const trimmed = companyName.trim();
  if (!trimmed) return undefined;

  const index = getMidSizedRegistryIndex();
  const cacheKey = normalizeCompanyLabel(trimmed);
  if (index.lookupCache.has(cacheKey)) {
    return index.lookupCache.get(cacheKey) ?? undefined;
  }

  const direct = cacheKey ? index.byNorm.get(cacheKey) : undefined;
  if (direct) {
    index.lookupCache.set(cacheKey, direct);
    return direct;
  }

  const found = index.companies.find((row) => companyLabelsMatch(row.companyName, trimmed));
  index.lookupCache.set(cacheKey, found ?? null);
  return found;
}

type SegmentClassifier = {
  inSegment(row: RecruitingEmployerAggregate, segment: RecruitingEmployerAdminSegment): boolean;
};

let segmentClassifier: SegmentClassifier | null = null;

function createSegmentClassifier(): SegmentClassifier {
  const ftcGroups = getFtcEnterpriseGroups();
  const enterpriseCrawlers = getCrawlerCompanies().filter((company) => company.tier === 'enterprise');
  const miscCrawlers = getCrawlerCompanies().filter((company) => company.tier === 'extra');
  const enterpriseSourceIds = new Set(enterpriseCrawlers.map((company) => company.sourceId));
  const miscSourceIds = new Set(miscCrawlers.map((company) => company.sourceId));

  const midSizedHit = new Map<string, MidSizedRegistryRecordView | null>();
  const ftcHit = new Map<string, boolean>();
  const enterpriseCrawlerHit = new Map<string, boolean>();
  const miscCrawlerHit = new Map<string, boolean>();

  function midSizedRecord(name: string): MidSizedRegistryRecordView | undefined {
    const cacheKey = normalizeCompanyLabel(name);
    if (midSizedHit.has(cacheKey)) return midSizedHit.get(cacheKey) ?? undefined;
    const record = findMidSizedRegistryRecord(name);
    midSizedHit.set(cacheKey, record ?? null);
    return record;
  }

  function matchesFtcEnterpriseGroup(name: string): boolean {
    const cacheKey = normalizeCompanyLabel(name);
    if (ftcHit.has(cacheKey)) return ftcHit.get(cacheKey)!;
    const result = ftcGroups.some((group) => companyLabelsMatch(name, group.name));
    ftcHit.set(cacheKey, result);
    return result;
  }

  function matchesEnterpriseCrawlerCompany(name: string): boolean {
    const cacheKey = normalizeCompanyLabel(name);
    if (enterpriseCrawlerHit.has(cacheKey)) return enterpriseCrawlerHit.get(cacheKey)!;
    const result = enterpriseCrawlers.some((company) => companyLabelsMatch(name, company.name));
    enterpriseCrawlerHit.set(cacheKey, result);
    return result;
  }

  function hasEnterpriseTierSource(sourceIds: string[]): boolean {
    return sourceIds.some((sourceId) => enterpriseSourceIds.has(sourceId));
  }

  function matchesMiscCrawlerCompany(name: string): boolean {
    const cacheKey = normalizeCompanyLabel(name);
    if (miscCrawlerHit.has(cacheKey)) return miscCrawlerHit.get(cacheKey)!;
    const result = miscCrawlers.some((company) => companyLabelsMatch(name, company.name));
    miscCrawlerHit.set(cacheKey, result);
    return result;
  }

  function hasMiscTierSource(sourceIds: string[]): boolean {
    return sourceIds.some((sourceId) => miscSourceIds.has(sourceId));
  }

  return {
    inSegment(row, segment) {
      const name = row.companyName;
      const midSized = midSizedRecord(name);

      if (segment === 'mid-sized') {
        return Boolean(midSized);
      }

      if (segment === 'misc') {
        if (midSized) return false;
        const misc =
          matchesMiscCrawlerCompany(name) || hasMiscTierSource(row.sourceIds);
        if (!misc) return false;
        return !isItComputingCompanyName(name);
      }

      if (segment === 'it') {
        const industry = midSized?.industry ?? null;
        return isItComputingCompany(name, industry) || isItComputingCompanyName(name);
      }

      if (midSized) return false;
      if (matchesMiscCrawlerCompany(name) || hasMiscTierSource(row.sourceIds)) return false;

      return (
        matchesFtcEnterpriseGroup(name) ||
        matchesEnterpriseCrawlerCompany(name) ||
        hasEnterpriseTierSource(row.sourceIds)
      );
    },
  };
}

function getSegmentClassifier(): SegmentClassifier {
  if (!segmentClassifier) segmentClassifier = createSegmentClassifier();
  return segmentClassifier;
}

export function isRecruitingEmployerInSegment(
  row: RecruitingEmployerAggregate,
  segment: RecruitingEmployerAdminSegment,
): boolean {
  return getSegmentClassifier().inSegment(row, segment);
}

export function filterRecruitingEmployersBySegment(
  aggregates: RecruitingEmployerAggregate[],
  segment: RecruitingEmployerAdminSegment,
): RecruitingEmployerAggregate[] {
  const classifier = getSegmentClassifier();
  return aggregates.filter((row) => classifier.inSegment(row, segment));
}

import { getCrawlerCompanies } from '@/lib/crawler/companies';
import { getFtcEnterpriseGroups } from '@/lib/enterprise-groups';
import {
  isItComputingCompany,
  isItComputingCompanyName,
  IT_ENTERPRISE_CRAWL_SOURCE_IDS,
} from '@/lib/it-companies/catalog';
import { isMidSizedCertificateActive } from '@/lib/mid-sized-companies/registry-dedupe';
import { loadMidSizedRegistryDbCompanies } from '@/lib/mid-sized-companies/registry-db';
import { activeJobCountForMidSizedCrawlSource } from '@/lib/crawled-jobs-server';
import { compareItCompaniesByFame } from '@/lib/it-companies/fame-rank';
import { resolveRegistryBusinessNumber } from '@/lib/recruiting-employers/careers-url-business-number';

export type ItCompanyRegistryRow = {
  companyName: string;
  businessNumber: string;
  segment: '대기업·계열' | '별도 등록' | '중견기업';
  active: boolean | null;
  careersUrl: string | null;
  linked: boolean;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
  careersUrlCheckedAt: string | null;
  activeJobCount: number;
  crawlSourceId: string | null;
};

function enterpriseItGroups() {
  const crawlers = new Map(getCrawlerCompanies().map((item) => [item.id, item]));
  const rows: ItCompanyRegistryRow[] = [];

  for (const group of getFtcEnterpriseGroups()) {
    const crawlSourceId = group.crawlSourceId;
    const isIt =
      (crawlSourceId && IT_ENTERPRISE_CRAWL_SOURCE_IDS.has(crawlSourceId)) ||
      isItComputingCompanyName(group.name);
    if (!isIt) continue;

    const crawler = crawlSourceId ? crawlers.get(crawlSourceId) : undefined;
    const careersUrl = crawler?.careersUrl ?? null;
    rows.push({
      companyName: group.name,
      businessNumber: resolveRegistryBusinessNumber({
        companyName: group.name,
        careersUrl,
        crawlSourceId: crawlSourceId ?? null,
        sourceId: crawler?.sourceId ?? null,
      }),
      segment: '대기업·계열',
      active: null,
      careersUrl,
      linked: Boolean(careersUrl),
      careersDiscoveryStatus: 'enterprise',
      careersUrlCheckedAt: null,
      activeJobCount: 0,
      crawlSourceId: crawler?.sourceId ?? null,
    });
  }

  for (const company of getCrawlerCompanies()) {
    if (company.tier !== 'extra') continue;
    if (!isItComputingCompanyName(company.name)) continue;
    rows.push({
      companyName: company.name,
      businessNumber: resolveRegistryBusinessNumber({
        companyName: company.name,
        careersUrl: company.careersUrl,
        crawlSourceId: company.id,
        sourceId: company.sourceId,
      }),
      segment: '별도 등록',
      active: null,
      careersUrl: company.careersUrl,
      linked: Boolean(company.careersUrl),
      careersDiscoveryStatus: 'enterprise',
      careersUrlCheckedAt: null,
      activeJobCount: 0,
      crawlSourceId: company.sourceId,
    });
  }

  return rows;
}

function midSizedItRows(): ItCompanyRegistryRow[] {
  const companies = loadMidSizedRegistryDbCompanies();
  return companies
    .filter((record) => isItComputingCompany(record.companyName, record.industry))
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
      };
    });
}

export function buildItCompanyRegistryRows(
  jobCountsBySource: Record<string, number>,
): ItCompanyRegistryRow[] {
  const seen = new Set<string>();
  const merged: ItCompanyRegistryRow[] = [];

  for (const row of [...enterpriseItGroups(), ...midSizedItRows()]) {
    const key = normalizeKey(row.companyName);
    if (seen.has(key)) continue;
    seen.add(key);
    const activeJobCount =
      row.crawlSourceId && row.segment === '중견기업'
        ? activeJobCountForMidSizedCrawlSource(row.crawlSourceId, jobCountsBySource)
        : row.crawlSourceId
          ? jobCountsBySource[row.crawlSourceId] ?? 0
          : 0;
    merged.push({ ...row, activeJobCount });
  }

  return merged.sort(compareItCompaniesByFame);
}

function normalizeKey(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

export function countItCompanyRegistryRows(): number {
  return buildItCompanyRegistryRows({}).length;
}

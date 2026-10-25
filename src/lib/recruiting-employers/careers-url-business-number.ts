import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { getCrawlerCompanies } from '@/lib/crawler/companies';
import { companyLabelsMatch, normalizeCompanyLabel } from '@/lib/crawler/company-name-match';
import { getMidSizedCareersConfigs } from '@/lib/crawler/mid-sized-careers-urls';
import { normalizeBusinessNumber } from '@/lib/mid-sized-companies/registry-dedupe';
import { loadMidSizedRegistryDbCompanies } from '@/lib/mid-sized-companies/registry-db';
import { findMidSizedRegistryRecord } from '@/lib/recruiting-employers/segments';

const PLACEHOLDER = '—';

export function normalizeRegistryCareersUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '') || '';
    return `${host}${path}`.toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, '').toLowerCase();
  }
}

function careersUrlHostname(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function careersUrlRootDomain(url: string): string | null {
  const host = careersUrlHostname(url);
  if (!host) return null;
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return host;
  return parts.slice(-2).join('.');
}

function formattedBusinessNumber(value: string | null | undefined): string | null {
  const digits = digitsOnly(value ?? '');
  if (digits.length !== 10) return null;
  return formatBusinessNumber(digits);
}

function businessNumberFromMidCrawlSourceId(crawlSourceId: string | null | undefined): string | null {
  if (!crawlSourceId) return null;
  const match = /^mid-(\d{10})$/.exec(crawlSourceId);
  if (!match) return null;
  return formatBusinessNumber(match[1]);
}

type UrlRegistryEntry = { companyName: string; businessNumber: string };

type CareersBusinessNumberIndex = {
  byNormalizedUrl: Map<string, UrlRegistryEntry[]>;
  byHostname: Map<string, UrlRegistryEntry[]>;
  byNormalizedCompanyName: Map<string, UrlRegistryEntry[]>;
  byCrawlSourceId: Map<string, string>;
  bySourceId: Map<string, string>;
};

let index: CareersBusinessNumberIndex | null = null;

function pushUrlRegistryEntry(
  map: Map<string, UrlRegistryEntry[]>,
  key: string,
  companyName: string,
  businessNumber: string,
): void {
  const bucket = map.get(key) ?? [];
  if (!bucket.some((item) => item.companyName === companyName && item.businessNumber === businessNumber)) {
    bucket.push({ companyName, businessNumber });
    map.set(key, bucket);
  }
}

function buildIndex(): CareersBusinessNumberIndex {
  const byNormalizedUrl = new Map<string, UrlRegistryEntry[]>();
  const byHostname = new Map<string, UrlRegistryEntry[]>();
  const byNormalizedCompanyName = new Map<string, UrlRegistryEntry[]>();
  const byCrawlSourceId = new Map<string, string>();
  const bySourceId = new Map<string, string>();

  const addUrlEntry = (url: string, companyName: string, businessNumber: string) => {
    const formatted = formattedBusinessNumber(businessNumber);
    if (!formatted) return;
    const key = normalizeRegistryCareersUrl(url);
    pushUrlRegistryEntry(byNormalizedUrl, key, companyName, formatted);
    const host = careersUrlHostname(url);
    if (host) pushUrlRegistryEntry(byHostname, host, companyName, formatted);
  };

  for (const record of loadMidSizedRegistryDbCompanies()) {
    const formatted = formattedBusinessNumber(record.businessNumber);
    if (!formatted) continue;
    const nameKey = normalizeCompanyLabel(record.companyName);
    if (nameKey) pushUrlRegistryEntry(byNormalizedCompanyName, nameKey, record.companyName, formatted);
    if (record.crawlSourceId) {
      byCrawlSourceId.set(record.crawlSourceId, formatted);
    }
    if (record.careersUrl?.trim()) {
      addUrlEntry(record.careersUrl, record.companyName, formatted);
    }
  }

  for (const config of getMidSizedCareersConfigs()) {
    const formatted = formattedBusinessNumber(config.businessNumber);
    if (!formatted) continue;
    byCrawlSourceId.set(config.crawlSourceId, formatted);
    addUrlEntry(config.careersUrl, config.name, formatted);
  }

  const partialIndex: CareersBusinessNumberIndex = {
    byNormalizedUrl,
    byHostname,
    byNormalizedCompanyName,
    byCrawlSourceId,
    bySourceId,
  };

  index = partialIndex;

  for (const company of getCrawlerCompanies()) {
    const resolved = resolveFromCareersUrlIndex(partialIndex, company.careersUrl, company.name);
    if (!resolved) continue;
    bySourceId.set(company.sourceId, resolved);
    byCrawlSourceId.set(company.id, resolved);
  }

  return partialIndex;
}

function getIndex(): CareersBusinessNumberIndex {
  if (!index) index = buildIndex();
  return index;
}

function pickFromUrlBucket(bucket: UrlRegistryEntry[], companyName: string): string | null {
  if (bucket.length === 0) return null;

  const labelMatch = bucket.filter((item) => companyLabelsMatch(item.companyName, companyName));
  if (labelMatch.length === 1) return labelMatch[0].businessNumber;

  const exact = bucket.filter(
    (item) => normalizeCompanyLabel(item.companyName) === normalizeCompanyLabel(companyName),
  );
  if (exact.length === 1) return exact[0].businessNumber;

  if (bucket.length === 1 && companyLabelsMatch(bucket[0].companyName, companyName)) {
    return bucket[0].businessNumber;
  }

  return null;
}

function resolveFromCareersUrlIndex(
  idx: CareersBusinessNumberIndex,
  careersUrl: string | null | undefined,
  companyName: string,
): string | null {
  if (!careersUrl?.trim()) return null;

  const urlKey = normalizeRegistryCareersUrl(careersUrl);
  const fromExact = pickFromUrlBucket(idx.byNormalizedUrl.get(urlKey) ?? [], companyName);
  if (fromExact) return fromExact;

  const host = careersUrlHostname(careersUrl);
  if (host) {
    const fromHost = pickFromUrlBucket(idx.byHostname.get(host) ?? [], companyName);
    if (fromHost) return fromHost;
  }

  return (
    businessNumberFromExactCompanyLabel(companyName, careersUrl, idx) ??
    businessNumberFromRegistryNameMatch(companyName, careersUrl) ??
    businessNumberFromDomesticGroupPrefix(companyName)
  );
}

function businessNumberFromExactCompanyLabel(
  companyName: string,
  careersUrl?: string | null,
  idx?: CareersBusinessNumberIndex,
): string | null {
  const target = normalizeCompanyLabel(companyName);
  if (!target) return null;

  const bucket = (idx ?? getIndex()).byNormalizedCompanyName.get(target) ?? [];
  if (bucket.length === 1) return bucket[0].businessNumber;

  if (bucket.length > 1 && careersUrl?.trim()) {
    const root = careersUrlRootDomain(careersUrl);
    if (root) {
      const scoped = bucket.filter((entry) => {
        const record = findMidSizedRegistryRecord(entry.companyName);
        if (!record?.careersUrl?.trim()) return false;
        return careersUrlRootDomain(record.careersUrl) === root;
      });
      if (scoped.length === 1) return scoped[0].businessNumber;
    }
  }

  return null;
}

function businessNumberFromRegistryNameMatch(
  companyName: string,
  careersUrl?: string | null,
): string | null {
  const record = findMidSizedRegistryRecord(companyName);
  if (!record) return null;
  const formatted = formattedBusinessNumber(record.businessNumber);
  if (!formatted) return null;
  if (!careersUrl?.trim() || !record.careersUrl?.trim()) return formatted;

  const targetRoot = careersUrlRootDomain(careersUrl);
  const recordRoot = careersUrlRootDomain(record.careersUrl);
  if (!targetRoot || !recordRoot) return formatted;
  if (targetRoot === recordRoot) return formatted;
  return null;
}

function businessNumberFromDomesticGroupPrefix(companyName: string): string | null {
  const prefix = normalizeCompanyLabel(companyName);
  if (prefix.length < 2) return null;

  const koreaCorp = loadMidSizedRegistryDbCompanies().find(
    (record) => normalizeCompanyLabel(record.companyName) === `${prefix}코리아`,
  );
  if (koreaCorp) return formattedBusinessNumber(koreaCorp.businessNumber);

  if (prefix.length < 3) return null;

  const exact = loadMidSizedRegistryDbCompanies().find(
    (record) => normalizeCompanyLabel(record.companyName) === prefix,
  );
  if (exact) return formattedBusinessNumber(exact.businessNumber);

  return null;
}

export function resolveRegistryBusinessNumber(input: {
  companyName: string;
  careersUrl?: string | null;
  crawlSourceId?: string | null;
  sourceId?: string | null;
  existing?: string | null;
}): string {
  const existing = formattedBusinessNumber(input.existing);
  if (existing && input.existing?.trim() !== PLACEHOLDER) return existing;

  const fromMidCrawl = businessNumberFromMidCrawlSourceId(input.crawlSourceId);
  if (fromMidCrawl) return fromMidCrawl;

  const idx = getIndex();

  if (input.sourceId) {
    const hit = idx.bySourceId.get(input.sourceId);
    if (hit) return hit;
  }

  if (input.crawlSourceId) {
    const hit = idx.byCrawlSourceId.get(input.crawlSourceId);
    if (hit) return hit;
  }

  if (input.sourceId?.endsWith('-careers')) {
    const crawlId = input.sourceId.slice(0, -'-careers'.length);
    const hit = idx.byCrawlSourceId.get(crawlId);
    if (hit) return hit;
  }

  const fromUrl = resolveFromCareersUrlIndex(idx, input.careersUrl, input.companyName);
  if (fromUrl) return fromUrl;

  const fromLabel = businessNumberFromExactCompanyLabel(input.companyName, input.careersUrl);
  if (fromLabel) return fromLabel;

  const fromRegistry = businessNumberFromRegistryNameMatch(input.companyName, input.careersUrl);
  if (fromRegistry) return fromRegistry;

  const fromPrefix = businessNumberFromDomesticGroupPrefix(input.companyName);
  if (fromPrefix) return fromPrefix;

  const digits = normalizeBusinessNumber(input.existing ?? '');
  if (digits.length === 10) return formatBusinessNumber(digits);

  return PLACEHOLDER;
}

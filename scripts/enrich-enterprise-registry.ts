/**
 * 대기업 명단 — 채용 URL(설정) + 채용 페이지에서 사업자번호 추출
 * pnpm enrich:enterprise-registry
 */
import { ENTERPRISE_CAREERS_CONFIGS } from '@/lib/crawler/enterprise-careers-urls';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import {
  buildEnterpriseRegistryDbFile,
  loadEnterpriseRegistryDbFromDisk,
  saveEnterpriseRegistryDbToDisk,
  type EnterpriseRegistryDbCompany,
} from '@/lib/enterprise-companies/registry-db';

const TIMEOUT_MS = Number(process.env.ENRICH_TIMEOUT_MS ?? 12_000);
const CONCURRENCY = Number(process.env.ENRICH_CONCURRENCY ?? 6);

const BN_PATTERN =
  /사업자\s*(?:등록)?\s*번호\s*[:\s]*([0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{5})/i;

function parseBn(html: string): string | null {
  const match = BN_PATTERN.exec(html);
  if (!match) return null;
  const digits = digitsOnly(match[1]);
  if (digits.length !== 10) return null;
  return formatBusinessNumber(digits);
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 JobLink365-Registry/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 400 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function homepage(url: string): string | null {
  try {
    const p = new URL(url);
    return `${p.protocol}//${p.host}/`;
  } catch {
    return null;
  }
}

function mentionsGroup(html: string, groupName: string, owner: string): boolean {
  const body = html.toLowerCase();
  const g = groupName.replace(/\s+/g, '').toLowerCase();
  if (g.length >= 2 && body.includes(g)) return true;
  const o = owner.replace(/\(주\)|주식회사/g, '').trim();
  if (o.length >= 2 && body.includes(o.toLowerCase())) return true;
  return false;
}

async function extractBusinessNumber(row: EnterpriseRegistryDbCompany): Promise<string | null> {
  if (!row.careersUrl?.trim()) return null;
  const urls = [row.careersUrl.trim(), homepage(row.careersUrl)].filter(Boolean) as string[];
  for (const url of urls) {
    const html = await fetchText(url);
    if (!html || !mentionsGroup(html, row.groupName, row.owner)) continue;
    const bn = parseBn(html);
    if (bn) return bn;
  }
  return null;
}

async function mapPool<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function run(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx]!);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => run()));
  return out;
}

async function main(): Promise<void> {
  const configByName = new Map(ENTERPRISE_CAREERS_CONFIGS.map((c) => [c.ftcName, c]));
  const base = buildEnterpriseRegistryDbFile();
  const companies = base.companies.map((row) => {
    const config = configByName.get(row.groupName);
    return {
      ...row,
      careersUrl: config?.careersUrl?.trim() || row.careersUrl,
      crawlSourceId: row.crawlSourceId ?? config?.crawlSourceId ?? null,
      sourceId:
        row.sourceId ??
        (config?.crawlSourceId ? `${config.crawlSourceId}-careers` : null),
    };
  });

  let found = 0;
  await mapPool(companies, async (row) => {
    const bn = await extractBusinessNumber(row);
    if (bn) {
      row.businessNumber = bn;
      found += 1;
      console.log(`  + ${row.groupName} → ${bn}`);
    }
  });

  const linked = companies.filter((c) => c.careersUrl?.trim()).length;
  const withBn = companies.filter((c) => digitsOnly(c.businessNumber ?? '').length === 10).length;

  saveEnterpriseRegistryDbToDisk({
    version: 1,
    updatedAt: new Date().toISOString(),
    sourceNote: base.sourceNote,
    companyCount: companies.length,
    careersUrlLinkedCount: linked,
    companies,
  });

  console.log(`대기업 ${companies.length}곳 · URL ${linked}곳 · 사업자번호 ${withBn}곳 (이번 추출 ${found}곳)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

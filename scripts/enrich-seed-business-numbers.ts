/**
 * 채용 URL 페이지·홈페이지에서 사업자등록번호를 추출해 시드 crawl-targets·registry-db에 반영합니다.
 * pnpm enrich:seed-business-numbers
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { loadSeedCareersCrawlTargets } from '@/lib/seed-careers/crawl-targets';
import { listSeedCareersCompanyNames } from '@/lib/seed-careers/company-names';
import { seedCareersTargetsPath } from '@/lib/seed-careers/paths';
import { loadSeedCareersRegistryOverrides } from '@/lib/seed-careers/registry-overrides';
import { parseSeedCareersSegment, SEED_CAREERS_SEGMENTS, type SeedCareersSegment } from '@/lib/seed-careers/segment';
import {
  buildSeedCareersRegistryDbFile,
  saveSeedCareersRegistryDbToDisk,
} from '@/lib/seed-careers/registry-db';
import type { SeedCareersTarget } from '@/lib/seed-careers/types';

const TIMEOUT_MS = Number(process.env.ENRICH_TIMEOUT_MS ?? 12_000);
const CONCURRENCY = Number(process.env.ENRICH_CONCURRENCY ?? 8);

const BN_PATTERN =
  /사업자\s*(?:등록)?\s*번호\s*[:\s]*([0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{5})/i;

function parseBnFromHtml(html: string): string | null {
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
    return text.length > 500 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function homepageFromCareersUrl(careersUrl: string): string | null {
  try {
    const parsed = new URL(careersUrl);
    return `${parsed.protocol}//${parsed.host}/`;
  } catch {
    return null;
  }
}

function htmlMentionsCompany(html: string, companyName: string): boolean {
  const compact = companyName.replace(/\(주\)|주식회사|㈜|\s+/g, '').toLowerCase();
  if (compact.length < 2) return false;
  const body = html.toLowerCase();
  return body.includes(compact) || body.includes(companyName.toLowerCase());
}

async function discoverBusinessNumber(
  companyName: string,
  careersUrl: string,
): Promise<string | null> {
  const pages = [careersUrl, homepageFromCareersUrl(careersUrl)].filter(Boolean) as string[];
  for (const url of pages) {
    const html = await fetchText(url);
    if (!html || !htmlMentionsCompany(html, companyName)) continue;
    const bn = parseBnFromHtml(html);
    if (bn) return bn;
  }
  return null;
}

async function mapPool<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function run(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await worker(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => run()));
  return results;
}

async function enrichSegment(segment: SeedCareersSegment): Promise<void> {
  const overrides = loadSeedCareersRegistryOverrides(segment);
  const names = new Set(listSeedCareersCompanyNames(segment).map((n) => n.trim()));
  const byName = new Map<string, SeedCareersTarget>();
  for (const target of loadSeedCareersCrawlTargets(segment)) {
    if (names.has(target.name.trim())) byName.set(target.name.trim(), target);
  }

  const pending = [...byName.values()].filter((t) => {
    if (overrides.get(t.name.trim())?.businessNumber) return false;
    return digitsOnly(t.businessNumber ?? '').length !== 10;
  });

  const label = segment === 'it' ? 'IT' : '반도체·디스플레이';
  console.log(`[${label}] 사업자번호 추출 대상 ${pending.length}곳`);

  let found = 0;
  await mapPool(pending, async (target) => {
    if (!target.careersUrl?.trim()) return;
    const bn = await discoverBusinessNumber(target.name, target.careersUrl.trim());
    if (bn) {
      target.businessNumber = bn;
      byName.set(target.name.trim(), target);
      found += 1;
      console.log(`  + ${target.name} → ${bn}`);
    }
  });

  const targetsPath = seedCareersTargetsPath(segment);
  const payload = JSON.parse(readFileSync(targetsPath, 'utf8')) as { version: number; segment: string };
  writeFileSync(
    targetsPath,
    stringifyJsonSafe({
      ...payload,
      generatedAt: new Date().toISOString(),
      targets: [...byName.values()],
    }),
    'utf8',
  );

  const dbFile = buildSeedCareersRegistryDbFile(segment);
  saveSeedCareersRegistryDbToDisk(segment, dbFile);
  console.log(
    `[${label}] 추출 성공 ${found}곳 · registry 사업자번호 ${dbFile.companies.filter((r) => digitsOnly(r.businessNumber ?? '').length === 10).length}/${dbFile.uniqueCompanyCount}`,
  );
}

async function main(): Promise<void> {
  const segmentArg = parseSeedCareersSegment(process.env.SEGMENT) ?? 'all';
  const segments: SeedCareersSegment[] =
    segmentArg === 'all' ? [...SEED_CAREERS_SEGMENTS] : [segmentArg];

  for (const segment of segments) {
    await enrichSegment(segment);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

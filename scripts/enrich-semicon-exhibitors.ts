/**
 * SEMICON Korea 2026 참가사 — eBooth 홈페이지·채용 URL·사업자번호 수집 → crawl-targets·registry-db
 * pnpm enrich:semicon-exhibitors
 *
 * SEMICON_PROFILE_ONLY=1 — eBooth 홈페이지만
 * SEMICON_SKIP_PROFILE=1 — 홈페이지는 건너뛰고 채용·사업자번호만
 * SEMICON_OFFSET, SEMICON_LIMIT, SEMICON_CONCURRENCY (기본 6)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import {
  clearSemiconExhibitorsCache,
  semiconExhibitorNormalizeKey,
  semiconExhibitorsDataPath,
  type SemiconExhibitorRecord,
} from '@/lib/semi-display-equipment/semicon-exhibitors';
import { isStorableCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';
import { seedCareersCrawlSourceId } from '@/lib/seed-careers/crawl-source-id';
import { seedCareersNormalizeKey } from '@/lib/seed-careers/normalize-key';
import { seedCareersTargetsPath } from '@/lib/seed-careers/paths';
import type { SeedCareersTarget } from '@/lib/seed-careers/types';
import { discoverCareersUrl, probeUrl } from './lib/mid-sized-discover-urls.mjs';
import { expandHomepageCareerPaths } from './lib/mid-sized-naver-discover.mjs';

const SEGMENT = 'semi-equipment' as const;
const EBOOTH_BASE = 'https://expo.semi.org/korea2026/Public/eBooth.aspx?BoothID=';
const CONCURRENCY = Number(process.env.SEMICON_CONCURRENCY ?? 6);
const TIMEOUT_MS = Number(process.env.SEMICON_TIMEOUT_MS ?? 12_000);
const PROFILE_ONLY = process.env.SEMICON_PROFILE_ONLY === '1';
const SKIP_PROFILE = process.env.SEMICON_SKIP_PROFILE === '1';

const BN_PATTERN =
  /사업자\s*(?:등록)?\s*번호\s*[:\s]*([0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{5})/i;

type ExhibitorsFile = {
  version: 1;
  updatedAt: string;
  sourceUrl: string;
  event: string;
  sourceNote: string;
  exhibitorCount: number;
  exhibitors: SemiconExhibitorRecord[];
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function loadExhibitorsFile(): ExhibitorsFile {
  const raw = JSON.parse(readFileSync(semiconExhibitorsDataPath, 'utf8')) as ExhibitorsFile;
  if (raw.version !== 1 || !Array.isArray(raw.exhibitors)) {
    throw new Error('semicon-korea-2026-exhibitors.json 형식이 올바르지 않습니다.');
  }
  return raw;
}

function saveExhibitorsFile(file: ExhibitorsFile): void {
  file.updatedAt = new Date().toISOString();
  file.exhibitorCount = file.exhibitors.length;
  writeFileSync(semiconExhibitorsDataPath, stringifyJsonSafe(file), 'utf8');
  clearSemiconExhibitorsCache();
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
    return text.length > 300 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseWebsiteFromEBoothHtml(html: string): string | null {
  const match = html.match(/class="aa-BoothContactUrl"[^>]*>(https?:\/\/[^<\s]+)/i);
  if (!match) return null;
  const url = decodeHtmlEntities(match[1].trim());
  try {
    const parsed = new URL(url);
    if (/semicon|a2zinc\.net|semi\.org/i.test(parsed.hostname)) return null;
    return parsed.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

async function fetchExhibitorWebsite(boothId: string): Promise<string | null> {
  const html = await fetchText(`${EBOOTH_BASE}${boothId}`);
  if (!html) return null;
  return parseWebsiteFromEBoothHtml(html);
}

function companyNameTokens(companyName: string): string[] {
  return companyName
    .replace(/\(co\.?-?exhibitor\)/gi, ' ')
    .replace(/\(주\)|주식회사|㈜|,|\./g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9가-힣]/gi, '').toLowerCase())
    .filter(
      (t) =>
        t.length >= 3 &&
        !['ltd', 'inc', 'corp', 'co', 'korea', 'limited', 'the', 'and', 'group'].includes(t),
    );
}

function htmlLikelySameCompany(html: string, companyName: string): boolean {
  const body = html.toLowerCase();
  const compact = companyName.replace(/\(주\)|주식회사|㈜|\s+/g, '').toLowerCase();
  if (compact.length >= 2 && body.includes(compact)) return true;
  const tokens = companyNameTokens(companyName);
  if (tokens.length === 0) return true;
  return tokens.filter((t) => body.includes(t)).length >= Math.min(2, tokens.length);
}

function parseBnFromHtml(html: string): string | null {
  const match = BN_PATTERN.exec(html);
  if (!match) return null;
  const digits = digitsOnly(match[1]);
  if (digits.length !== 10) return null;
  return formatBusinessNumber(digits);
}

async function discoverCareersFromWebsite(companyName: string, websiteUrl: string): Promise<string | null> {
  let origin: string;
  try {
    origin = new URL(websiteUrl).origin;
  } catch {
    return null;
  }
  const fromPaths = await expandHomepageCareerPaths(origin, probeUrl, TIMEOUT_MS);
  if (fromPaths && isStorableCareersUrl(fromPaths)) return fromPaths;

  const hit = await discoverCareersUrl({ companyName, businessNumber: '' }, TIMEOUT_MS);
  if (hit && isStorableCareersUrl(hit)) return hit;
  return null;
}

async function discoverBusinessNumber(
  companyName: string,
  careersUrl: string,
  websiteUrl: string | null,
): Promise<string | null> {
  const pages = [careersUrl, websiteUrl].filter(Boolean) as string[];
  for (const url of pages) {
    const html = await fetchText(url);
    if (!html || !htmlLikelySameCompany(html, companyName)) continue;
    const bn = parseBnFromHtml(html);
    if (bn) return bn;
  }
  return null;
}

async function mapPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function run(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => run()));
}

function loadTargets(): { file: { version: 1; segment: string; generatedAt: string | null }; byNorm: Map<string, SeedCareersTarget> } {
  const path = seedCareersTargetsPath(SEGMENT);
  const file = JSON.parse(readFileSync(path, 'utf8')) as {
    version: 1;
    segment: string;
    generatedAt: string | null;
    targets: SeedCareersTarget[];
  };
  const byNorm = new Map<string, SeedCareersTarget>();
  for (const t of file.targets ?? []) {
    const norm = seedCareersNormalizeKey(SEGMENT, t.name);
    if (norm) byNorm.set(norm, t);
  }
  return { file, byNorm };
}

function saveTargets(
  file: { version: 1; segment: string; generatedAt: string | null },
  byNorm: Map<string, SeedCareersTarget>,
): void {
  writeFileSync(
    seedCareersTargetsPath(SEGMENT),
    stringifyJsonSafe({
      ...file,
      segment: SEGMENT,
      generatedAt: new Date().toISOString(),
      targets: [...byNorm.values()],
    }),
    'utf8',
  );
}

function upsertTarget(
  byNorm: Map<string, SeedCareersTarget>,
  companyName: string,
  careersUrl: string,
  businessNumber: string | null,
): void {
  const norm = seedCareersNormalizeKey(SEGMENT, companyName);
  if (!norm) return;
  const existing = byNorm.get(norm);
  byNorm.set(norm, {
    name: companyName,
    crawlSourceId: existing?.crawlSourceId ?? seedCareersCrawlSourceId(SEGMENT, companyName),
    careersUrl,
    businessNumber: businessNumber ?? existing?.businessNumber ?? null,
    adapter: careersUrl.includes('greenhouse.io') ? 'greenhouse' : existing?.adapter ?? 'generic',
    greenhouseBoard: existing?.greenhouseBoard ?? null,
  });
}

async function main(): Promise<void> {
  const file = loadExhibitorsFile();
  const offset = Math.max(0, Number(process.env.SEMICON_OFFSET ?? 0) || 0);
  const limitEnv = process.env.SEMICON_LIMIT;
  const limit =
    limitEnv == null || limitEnv === '' ? file.exhibitors.length : Math.max(0, Number(limitEnv) || 0);
  const slice = file.exhibitors.slice(offset, offset + limit);

  let profilesFound = 0;
  if (!SKIP_PROFILE) {
    const needProfile = slice.filter((row) => row.boothId && !row.websiteUrl?.trim());
    console.log(`eBooth 홈페이지 수집 ${needProfile.length}/${slice.length}곳`);
    await mapPool(needProfile, async (row) => {
      const boothId = row.boothId!.trim();
      const website = await fetchExhibitorWebsite(boothId);
      row.websiteCheckedAt = new Date().toISOString();
      if (website) {
        row.websiteUrl = website;
        profilesFound += 1;
      }
    });
    saveExhibitorsFile(file);
    console.log(`홈페이지 확인 ${profilesFound}곳 (누적 ${file.exhibitors.filter((r) => r.websiteUrl).length}곳)`);
  }

  if (PROFILE_ONLY) return;

  const { file: targetsFile, byNorm } = loadTargets();
  let careersFound = 0;
  let bnFound = 0;

  const needCareers = slice.filter((row) => {
    const norm = semiconExhibitorNormalizeKey(row.companyName);
    if (!norm) return false;
    const existing = byNorm.get(norm);
    if (existing?.careersUrl && isStorableCareersUrl(existing.careersUrl)) return false;
    return Boolean(row.websiteUrl?.trim());
  });

  console.log(`채용 URL 탐색 ${needCareers.length}곳 (홈페이지 있음)`);
  let done = 0;
  await mapPool(needCareers, async (row) => {
    const website = row.websiteUrl!.trim();
    const careersUrl = await discoverCareersFromWebsite(row.companyName, website);
    done += 1;
    if (careersUrl) {
      careersFound += 1;
      let bn = await discoverBusinessNumber(row.companyName, careersUrl, website);
      if (bn) bnFound += 1;
      upsertTarget(byNorm, row.companyName, careersUrl, bn);
      console.log(`  + ${row.companyName}`);
    }
    if (done % 25 === 0 || done === needCareers.length) {
      saveTargets(targetsFile, byNorm);
      console.log(`진행 ${done}/${needCareers.length} · URL ${careersFound} · 사업자번호 ${bnFound}`);
    }
  });

  const needBnOnly = slice.filter((row) => {
    const norm = semiconExhibitorNormalizeKey(row.companyName);
    if (!norm) return false;
    const existing = byNorm.get(norm);
    if (!existing?.careersUrl || !isStorableCareersUrl(existing.careersUrl)) return false;
    return digitsOnly(existing.businessNumber ?? '').length !== 10;
  });

  console.log(`사업자번호만 보강 ${needBnOnly.length}곳`);
  await mapPool(needBnOnly, async (row) => {
    const norm = semiconExhibitorNormalizeKey(row.companyName);
    const existing = byNorm.get(norm!)!;
    const bn = await discoverBusinessNumber(
      row.companyName,
      existing.careersUrl!,
      row.websiteUrl?.trim() ?? null,
    );
    if (bn) {
      bnFound += 1;
      upsertTarget(byNorm, row.companyName, existing.careersUrl!, bn);
    }
  });

  saveTargets(targetsFile, byNorm);
  console.log(`crawl-targets 저장 — URL 연결 ${byNorm.size}곳 (이번 +${careersFound})`);

  console.log('registry DB 반영…');
  const result = spawnSync('pnpm', ['reconcile:seed-careers'], {
    cwd: resolve(process.cwd()),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, SEGMENT: 'semi-equipment' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);

  spawnSync('pnpm', ['sync:seed-registry'], {
    cwd: resolve(process.cwd()),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, SEGMENT: 'semi-equipment' },
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * 반도체·디스플레이 시드 중 사업자번호가 없는 회사를 회사명으로 찾습니다.
 * 1) DART 회사검색에서 상호·영문명이 정확히 같은 곳만
 * 2) 같은 이름 법인이 여럿이면 채용 사이트와 홈페이지 도메인이 같은 곳만
 * 3) 그래도 없으면, 회사 도메인 홈페이지에 사업자번호가 하나만 있을 때
 * 찾은 번호는 국세청 계속사업자일 때만 저장합니다.
 *
 * pnpm lookup:semi-business-numbers
 * LOOKUP_DRY=1 이면 저장하지 않습니다. LOOKUP_ONLY=기가레인,인텍플러스 로 일부만.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { isPortalCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { seedCareersRegistryDbPath, seedCareersTargetsPath } from '@/lib/seed-careers/paths';
import {
  buildSeedCareersRegistryDbFile,
  saveSeedCareersRegistryDbToDisk,
} from '@/lib/seed-careers/registry-db';
import { loadSeedCareersRegistryOverrides } from '@/lib/seed-careers/registry-overrides';
import { lookupNtsBusinessStatus } from '@/lib/nts-business-status';
import type { SeedCareersTarget } from '@/lib/seed-careers/types';

const SEGMENT = 'semi-equipment' as const;
const DART_SEARCH = 'https://dart.fss.or.kr/corp/searchCorpL.ax?textCrpNm=';
const DART_POPUP = 'https://dart.fss.or.kr/dsae001/selectPopup.ax?selectKey=';
const UA = 'Mozilla/5.0 JobLink365-Registry/1.0';

const NOT_OWN_HOST =
  /recruiter\.co\.kr|jobploy|theteams\.kr|ibkonejob|korchamhrd|greetinghr|ninehire|greenhouse\.io|lever\.co|ashbyhq|wanted\.co\.kr|jobkorea|saramin|catch\.co\.kr|incruit|work24|bzpp\.co\.kr|prime-career|asscareer|jobplanet|rememberapp|notion\.site|tistory\.com|blog\.naver|linkareer|inthiswork/i;

type DartHit = {
  corpName: string;
  englishName: string;
  businessNumber: string;
  cik: string;
};

type Found = {
  name: string;
  businessNumber: string;
  via: 'dart' | 'homepage';
};

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function normName(value: string): string {
  return value
    .replace(/\(주\)|주식회사|㈜/g, '')
    .replace(/\b(?:co\.?,?\s*ltd\.?|inc\.?|corp\.?|corporation|limited|company|korea|ltd|co)\b/gi, '')
    .replace(/[^a-z0-9가-힣]/gi, '')
    .toLowerCase();
}

function isValidBusinessNumber(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const nums = digits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += nums[i]! * weights[i]!;
  sum += Math.floor((nums[8]! * 5) / 10);
  return (10 - (sum % 10)) % 10 === nums[9];
}

function formatIfValid(raw: string): string | null {
  const digits = digitsOnly(raw);
  if (!isValidBusinessNumber(digits)) return null;
  return formatBusinessNumber(digits);
}

function hostnameOf(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function rootDomain(host: string): string {
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return host;
  return parts.slice(-2).join('.');
}

function isOwnCompanyHost(url: string | null | undefined): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  if (isPortalCareersUrl(url)) return false;
  if (NOT_OWN_HOST.test(host) || NOT_OWN_HOST.test(url ?? '')) return false;
  return true;
}

function hostRelated(host: string, companyName: string): boolean {
  const label = host.split('.')[0] ?? '';
  const compact = normName(companyName);
  if (label.length < 4 || compact.length < 4) return false;
  return label.includes(compact) || compact.includes(label);
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseDartHits(html: string): DartHit[] {
  const hits: DartHit[] = [];
  const rowRe =
    /<td[^>]*title="([^"]*사업자번호[^"]*)"[^>]*>[\s\S]*?hiddenCikCD\d+' value='(\d+)'[\s\S]*?hiddenCikNM\d+' value='([^']*)'/g;
  for (const match of html.matchAll(rowRe)) {
    const decoded = match[1]
      .replace(/&nbsp;/g, '')
      .replace(/&#10;/g, '\n')
      .replace(/&amp;/g, '&');
    const corpName = decoded.match(/회사명\s*:\s*([^\n]+)/)?.[1]?.trim() ?? match[3].trim();
    const englishName = decoded.match(/영문명\s*:\s*([^\n]+)/)?.[1]?.trim() ?? '';
    const businessNumber = formatIfValid(decoded.match(/사업자번호\s*:\s*([0-9-]+)/)?.[1] ?? '');
    if (!corpName || !businessNumber) continue;
    hits.push({ corpName, englishName, businessNumber, cik: match[2] });
  }
  return hits;
}

async function searchDart(name: string): Promise<DartHit[]> {
  const html = await fetchText(`${DART_SEARCH}${encodeURIComponent(name)}`, 12_000);
  if (!html) return [];
  return parseDartHits(html);
}

async function popupHomepageHost(cik: string): Promise<string | null> {
  const html = await fetchText(`${DART_POPUP}${encodeURIComponent(cik)}`, 12_000);
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const homepage = text.match(/홈페이지\s+(\S+)/)?.[1] ?? '';
  if (!homepage || homepage === '-' ) return null;
  const withScheme = /^https?:\/\//i.test(homepage) ? homepage : `https://${homepage}`;
  return hostnameOf(withScheme);
}

function exactHits(query: string, hits: DartHit[]): DartHit[] {
  const key = normName(query);
  if (key.length < 2) return [];
  const matched = hits.filter((hit) => {
    const corp = normName(hit.corpName);
    const english = normName(hit.englishName);
    return corp === key || (english.length >= 2 && english === key);
  });
  const byBn = new Map<string, DartHit>();
  for (const hit of matched) byBn.set(hit.businessNumber, hit);
  return [...byBn.values()];
}

async function pickDart(query: string, careersUrl: string | null): Promise<string | null> {
  const hits = exactHits(query, await searchDart(query));
  if (hits.length === 1) return hits[0]!.businessNumber;
  if (hits.length === 0) return null;
  const careersHost = hostnameOf(careersUrl);
  if (!careersHost || !isOwnCompanyHost(careersUrl)) return null;
  const wanted = rootDomain(careersHost);
  const matched: string[] = [];
  for (const hit of hits) {
    const host = await popupHomepageHost(hit.cik);
    if (host && rootDomain(host) === wanted) matched.push(hit.businessNumber);
  }
  const unique = [...new Set(matched)];
  return unique.length === 1 ? unique[0]! : null;
}

const BN_IN_HTML =
  /사업자\s*(?:등록)?\s*번호\s*[:\s]*([0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{5})/gi;

async function businessNumberFromOwnSite(
  companyName: string,
  pageUrl: string,
): Promise<string | null> {
  if (!isOwnCompanyHost(pageUrl)) return null;
  const host = hostnameOf(pageUrl);
  if (!host || !hostRelated(host, companyName)) return null;
  const origin = `https://${host}/`;
  const pages = pageUrl === origin ? [origin] : [origin, pageUrl];
  const found = new Set<string>();
  for (const url of pages) {
    const html = await fetchText(url, 10_000);
    if (!html) continue;
    for (const match of html.matchAll(BN_IN_HTML)) {
      const formatted = formatIfValid(match[1] ?? '');
      if (formatted) found.add(formatted);
    }
  }
  return found.size === 1 ? [...found][0]! : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function main() {
  loadEnvLocal();
  const dry = process.env.LOOKUP_DRY === '1';
  const only = new Set(
    (process.env.LOOKUP_ONLY ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  );

  const targetsPath = seedCareersTargetsPath(SEGMENT);
  const raw = JSON.parse(readFileSync(targetsPath, 'utf8')) as {
    version: number;
    segment: string;
    targets: SeedCareersTarget[];
  };
  const targets = raw.targets ?? [];
  const targetByName = new Map(targets.map((target) => [target.name.trim(), target]));
  const registry = JSON.parse(readFileSync(seedCareersRegistryDbPath(SEGMENT), 'utf8')) as {
    companies: Array<{ companyName: string; businessNumber?: string | null; careersUrl?: string | null }>;
  };
  const used = new Set<string>();
  for (const target of targets) {
    const formatted = formatIfValid(target.businessNumber ?? '');
    if (formatted) used.add(formatted);
  }
  for (const override of loadSeedCareersRegistryOverrides(SEGMENT).values()) {
    const formatted = formatIfValid(override.businessNumber ?? '');
    if (formatted) used.add(formatted);
  }

  const pending = (registry.companies ?? [])
    .filter((row) => !formatIfValid(row.businessNumber ?? ''))
    .filter((row) => !targetByName.has(row.companyName.trim()))
    .filter((row) => only.size === 0 || only.has(row.companyName.trim()))
    .map((row) => ({
      name: row.companyName.trim(),
      careersUrl: row.careersUrl ?? null,
    }));

  console.log(`사업자번호 조회 대상 ${pending.length}곳${dry ? ' (저장 안 함)' : ''}`);

  const found: Found[] = [];
  const ambiguous: string[] = [];
  let index = 0;
  for (const target of pending) {
    index += 1;
    const fromDart = await pickDart(target.name, target.careersUrl ?? null);
    let businessNumber = fromDart;
    let via: Found['via'] = 'dart';
    if (!businessNumber && target.careersUrl) {
      businessNumber = await businessNumberFromOwnSite(target.name, target.careersUrl);
      via = 'homepage';
    }
    if (!businessNumber) {
      if (index % 25 === 0 || index === pending.length) {
        console.log(`  진행 ${index}/${pending.length} · 찾음 ${found.length}`);
      }
      await sleep(80);
      continue;
    }
    if (used.has(businessNumber)) {
      ambiguous.push(`${target.name} (이미 다른 회사에 있는 번호)`);
      await sleep(80);
      continue;
    }
    used.add(businessNumber);
    found.push({ name: target.name, businessNumber, via });
    console.log(`  + ${target.name} → ${businessNumber} (${via === 'dart' ? 'DART' : '홈페이지'})`);
    await sleep(80);
  }

  const verified: Found[] = [];
  const rejected: string[] = [];
  for (const item of found) {
    const status = await lookupNtsBusinessStatus(item.businessNumber);
    if (status.status === 'active') {
      verified.push(item);
      continue;
    }
    rejected.push(`${item.name} ${item.businessNumber} (${status.statusLabel})`);
  }

  console.log(`국세청 계속사업자 ${verified.length}곳 · 제외 ${rejected.length}곳`);
  for (const line of rejected) console.log(`  - ${line}`);
  if (ambiguous.length > 0) {
    console.log(`같은 번호·동명이인으로 건너뜀 ${ambiguous.length}곳`);
    for (const line of ambiguous) console.log(`  - ${line}`);
  }

  if (dry) return;

  const byName = new Map(verified.map((item) => [item.name, item.businessNumber]));
  let applied = 0;
  for (const target of targets) {
    const next = byName.get(target.name);
    if (!next) continue;
    target.businessNumber = next;
    applied += 1;
  }

  const overridesPath = resolve(process.cwd(), 'data/semi-seed-registry-overrides.json');
  const overridesFile = JSON.parse(readFileSync(overridesPath, 'utf8')) as {
    version: number;
    updatedAt?: string;
    companies: Array<{
      seedCompanyName: string;
      registryCompanyName?: string;
      businessNumber?: string;
      careersUrl?: string;
    }>;
  };
  const overrideRows = overridesFile.companies ?? [];
  const overrideIndex = new Map(overrideRows.map((row) => [row.seedCompanyName.trim(), row]));
  for (const [name, businessNumber] of byName) {
    const existing = overrideIndex.get(name);
    if (existing) {
      existing.businessNumber = digitsOnly(businessNumber);
      continue;
    }
    const row = {
      seedCompanyName: name,
      registryCompanyName: name,
      businessNumber: digitsOnly(businessNumber),
    };
    overrideRows.push(row);
    overrideIndex.set(name, row);
    applied += targetByName.has(name) ? 0 : 1;
  }
  overridesFile.companies = overrideRows;
  overridesFile.updatedAt = new Date().toISOString();

  const { writeFileSync } = await import('node:fs');
  writeFileSync(overridesPath, stringifyJsonSafe(overridesFile), 'utf8');
  writeFileSync(
    targetsPath,
    stringifyJsonSafe({
      version: raw.version ?? 1,
      generatedAt: new Date().toISOString(),
      segment: SEGMENT,
      targets,
    }),
    'utf8',
  );
  const dbFile = buildSeedCareersRegistryDbFile(SEGMENT);
  saveSeedCareersRegistryDbToDisk(SEGMENT, dbFile);
  const withBn = dbFile.companies.filter(
    (row) => digitsOnly(row.businessNumber ?? '').length === 10,
  ).length;
  console.log(`저장 ${applied}곳 · registry 사업자번호 ${withBn}/${dbFile.uniqueCompanyCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

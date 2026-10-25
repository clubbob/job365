/**
 * IT·반도체 장비 시드 명단 채용 URL 탐색 → data/*-seed-crawl-targets.json
 *
 * SEGMENT=it | semi-equipment | all (기본 all)
 * DISCOVER_OFFSET, DISCOVER_LIMIT, DISCOVER_CONCURRENCY, DISCOVER_TIMEOUT_MS
 * DISCOVER_ALL_MISSING=1 — URL 없는 회사 재탐색
 * DISCOVER_RETRY_NOT_FOUND=1 — not_found 재시도
 * DISCOVER_AUTO_RECONCILE=0 — reconcile 생략
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isStorableCareersUrl } from './lib/careers-url-policy.mjs';
import { discoverCareersUrl } from './lib/mid-sized-discover-urls.mjs';
import { listSeedCareersCompanyNames } from '@/lib/seed-careers/company-names';
import { seedCareersCrawlSourceId } from '@/lib/seed-careers/crawl-source-id';
import { seedCareersNormalizeKey } from '@/lib/seed-careers/normalize-key';
import { seedCareersTargetsPath } from '@/lib/seed-careers/paths';
import { parseSeedCareersSegment, SEED_CAREERS_SEGMENTS, type SeedCareersSegment } from '@/lib/seed-careers/segment';
import type { SeedCareersDiscoveryEntry, SeedCareersTarget } from '@/lib/seed-careers/types';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { loadSeedCareersDiscoveryState, saveSeedCareersDiscoveryState } from '@/lib/seed-careers/discovery-state';

const root = process.cwd();
const CONCURRENCY = Number(process.env.DISCOVER_CONCURRENCY ?? 12);
const TIMEOUT_MS = Number(process.env.DISCOVER_TIMEOUT_MS ?? 8000);
const ALL_MISSING = process.env.DISCOVER_ALL_MISSING === '1';
const RETRY_NOT_FOUND = process.env.DISCOVER_RETRY_NOT_FOUND === '1';
const REPROBE_BAD = process.env.DISCOVER_REPROBE_BAD !== '0';

type TargetsFile = {
  version: 1;
  generatedAt: string | null;
  segment: SeedCareersSegment;
  targets: SeedCareersTarget[];
};

function loadTargets(segment: SeedCareersSegment): TargetsFile {
  const path = seedCareersTargetsPath(segment);
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as TargetsFile;
    return {
      version: 1,
      generatedAt: raw.generatedAt ?? null,
      segment,
      targets: Array.isArray(raw.targets) ? raw.targets : [],
    };
  } catch {
    return { version: 1, generatedAt: null, segment, targets: [] };
  }
}

function saveTargets(file: TargetsFile, targets: SeedCareersTarget[]): void {
  const payload = {
    ...file,
    generatedAt: new Date().toISOString(),
    targets,
  };
  writeFileSync(seedCareersTargetsPath(file.segment), stringifyJsonSafe(payload), 'utf8');
}

async function discoverForCompany(segment: SeedCareersSegment, companyName: string): Promise<SeedCareersTarget | null> {
  const hit = await discoverCareersUrl({ companyName, businessNumber: '' }, TIMEOUT_MS);
  if (!hit || !isStorableCareersUrl(hit)) return null;
  return {
    name: companyName,
    crawlSourceId: seedCareersCrawlSourceId(segment, companyName),
    careersUrl: hit,
    adapter: hit.includes('greenhouse.io') ? 'greenhouse' : 'generic',
    greenhouseBoard:
      hit.includes('boards.greenhouse.io/')
        ? hit.split('boards.greenhouse.io/')[1]?.replace(/\/$/, '') ?? null
        : null,
  };
}

async function mapPool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  onProgress: (item: T, result: R, done: number, total: number) => Promise<void> | void,
): Promise<void> {
  let index = 0;
  let done = 0;
  async function run(): Promise<void> {
    while (index < items.length) {
      const current = index++;
      const item = items[current]!;
      const result = await worker(item);
      done += 1;
      await onProgress(item, result, done, items.length);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => run()));
}

async function discoverSegment(segment: SeedCareersSegment): Promise<void> {
  const allNames = listSeedCareersCompanyNames(segment);
  const offset = Math.max(0, Number(process.env.DISCOVER_OFFSET ?? 0) || 0);
  const limitEnv = process.env.DISCOVER_LIMIT;
  const limit =
    limitEnv == null || limitEnv === '' ? allNames.length : Math.max(0, Number(limitEnv) || 0);
  const slice = allNames.slice(offset, offset + limit);

  const file = loadTargets(segment);
  const discoveryState = loadSeedCareersDiscoveryState(segment);
  const byNorm = new Map<string, SeedCareersTarget>();
  for (const item of file.targets) {
    const key = seedCareersNormalizeKey(segment, item.name);
    if (key) byNorm.set(key, item);
  }

  const pending = slice.filter((companyName) => {
    const norm = seedCareersNormalizeKey(segment, companyName);
    if (!norm) return false;
    const existing = byNorm.get(norm);
    const hasUrl = existing?.careersUrl && isStorableCareersUrl(existing.careersUrl);
    if (ALL_MISSING && !hasUrl) {
      if (existing && REPROBE_BAD && !isStorableCareersUrl(existing.careersUrl)) {
        byNorm.delete(norm);
      }
      return true;
    }
    if (hasUrl) return false;
    if (existing && REPROBE_BAD && !isStorableCareersUrl(existing.careersUrl)) {
      byNorm.delete(norm);
      return true;
    }
    if (existing) return false;
    const prior = discoveryState.entries[norm];
    if (prior?.status === 'not_found') return RETRY_NOT_FOUND;
    return true;
  });

  console.log(
    `[${segment}] 시드 ${allNames.length}곳 · 구간 ${slice.length}곳 · 신규 탐색 ${pending.length}곳 (기존 URL ${file.targets.length}곳)`,
  );

  const checkedAt = () => new Date().toISOString();

  await mapPool(
    pending,
    (companyName) => discoverForCompany(segment, companyName),
    async (companyName, result, done, total) => {
      const norm = seedCareersNormalizeKey(segment, companyName);
      if (!norm) return;
      if (result) {
        byNorm.set(norm, result);
        discoveryState.entries[norm] = {
          status: 'found',
          checkedAt: checkedAt(),
          careersUrl: result.careersUrl,
        };
      } else {
        discoveryState.entries[norm] = { status: 'not_found', checkedAt: checkedAt() };
      }
      if (done % 100 === 0 || done === total) {
        console.log(`[${segment}] 진행 ${done}/${total} (누적 URL ${byNorm.size}곳)`);
        saveSeedCareersDiscoveryState(segment, discoveryState.entries);
        saveTargets(file, [...byNorm.values()]);
      }
    },
  );

  saveSeedCareersDiscoveryState(segment, discoveryState.entries);
  saveTargets(file, [...byNorm.values()]);
  console.log(`[${segment}] 저장 완료 — 채용 URL ${byNorm.size}곳`);
}

async function main(): Promise<void> {
  const segmentArg = parseSeedCareersSegment(process.env.SEGMENT) ?? 'all';
  const segments: SeedCareersSegment[] =
    segmentArg === 'all' ? [...SEED_CAREERS_SEGMENTS] : [segmentArg];

  for (const segment of segments) {
    await discoverSegment(segment);
  }

  if (process.env.DISCOVER_AUTO_RECONCILE !== '0') {
    console.log('registry DB 반영…');
    const result = spawnSync('pnpm', ['reconcile:seed-careers'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';

/** IDE·git에 올리지 않는 로컬 전용 경로 */
export const CRAWLED_SOURCE_STATS_CACHE_PATH = resolve(process.cwd(), '.cache/crawled-source-stats.json');

const LEGACY_CACHE_PATH = resolve(process.cwd(), 'data/crawled-source-stats-cache.json');

/** 슬림 캐시만 허용(수 MB짜리 v1 전체 집계 파일 방지) */
const MAX_CACHE_FILE_BYTES = 512_000;

/** 개발·관리자 화면 — 메모리 TTL보다 길게 두어 재시작 후에도 빠르게 복구 */
export const CRAWLED_SOURCE_STATS_DISK_TTL_MS = 300_000;

/** 디스크에는 소스별 건수만 저장합니다(회사·계열사 전체 맵은 메모리에서만). */
export type PersistedCrawledJobSourceStats = {
  version: 2;
  cachedAt: number;
  cacheKey: string;
  jobCountsBySource: Record<string, number>;
};

function ensureCacheDir(): void {
  const dir = dirname(CRAWLED_SOURCE_STATS_CACHE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function removeOversizedCacheFile(path: string): void {
  try {
    if (!existsSync(path)) return;
    const { size } = statSync(path);
    if (size > MAX_CACHE_FILE_BYTES) {
      unlinkSync(path);
      console.warn('[crawled-jobs] removed oversized source stats cache', path, `${size} bytes`);
    }
  } catch {
    // ignore
  }
}

function parsePersistedPayload(raw: unknown, cacheKey: string): PersistedCrawledJobSourceStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (record.cacheKey !== cacheKey) return null;
  if (!record.jobCountsBySource || typeof record.jobCountsBySource !== 'object') return null;

  const cachedAt = Number(record.cachedAt);
  if (!Number.isFinite(cachedAt)) return null;

  const version = record.version;
  if (version !== 2 && version !== 1) return null;

  return {
    version: 2,
    cachedAt,
    cacheKey,
    jobCountsBySource: record.jobCountsBySource as Record<string, number>,
  };
}

function readCacheFile(path: string, cacheKey: string): PersistedCrawledJobSourceStats | null {
  removeOversizedCacheFile(path);
  if (!existsSync(path)) return null;

  try {
    const { size } = statSync(path);
    if (size > MAX_CACHE_FILE_BYTES) {
      unlinkSync(path);
      return null;
    }
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    const parsed = parsePersistedPayload(raw, cacheKey);
    if (!parsed) return null;
    if (raw && typeof raw === 'object' && (raw as { version?: number }).version === 1) {
      writePersistedCrawledJobSourceStats(parsed);
    }
    return parsed;
  } catch {
    try {
      unlinkSync(path);
    } catch {
      // ignore
    }
    return null;
  }
}

function readPersistedCrawledJobSourceStatsFile(cacheKey: string): PersistedCrawledJobSourceStats | null {
  removeOversizedCacheFile(LEGACY_CACHE_PATH);

  const current = readCacheFile(CRAWLED_SOURCE_STATS_CACHE_PATH, cacheKey);
  if (current) return current;

  const legacy = readCacheFile(LEGACY_CACHE_PATH, cacheKey);
  if (legacy) {
    writePersistedCrawledJobSourceStats(legacy);
    try {
      if (existsSync(LEGACY_CACHE_PATH)) unlinkSync(LEGACY_CACHE_PATH);
    } catch {
      // ignore
    }
  }
  return legacy;
}

export function readPersistedCrawledJobSourceStats(
  cacheKey: string,
): PersistedCrawledJobSourceStats | null {
  const raw = readPersistedCrawledJobSourceStatsFile(cacheKey);
  if (!raw) return null;
  if (Date.now() - raw.cachedAt > CRAWLED_SOURCE_STATS_DISK_TTL_MS) return null;
  return raw;
}

/** TTL이 지났어도 관리자 목록 등에서 즉시 응답용으로 씁니다. */
export function readPersistedCrawledJobSourceStatsStale(
  cacheKey: string,
): PersistedCrawledJobSourceStats | null {
  return readPersistedCrawledJobSourceStatsFile(cacheKey);
}

export function writePersistedCrawledJobSourceStats(payload: PersistedCrawledJobSourceStats): void {
  const slim: PersistedCrawledJobSourceStats = {
    version: 2,
    cachedAt: payload.cachedAt,
    cacheKey: payload.cacheKey,
    jobCountsBySource: payload.jobCountsBySource,
  };

  try {
    ensureCacheDir();
    writeFileSync(CRAWLED_SOURCE_STATS_CACHE_PATH, stringifyJsonSafe(slim), 'utf8');
  } catch (error) {
    console.warn('[crawled-jobs] failed to persist source stats cache', error);
  }
}

export function clearPersistedCrawledJobSourceStats(): void {
  for (const path of [CRAWLED_SOURCE_STATS_CACHE_PATH, LEGACY_CACHE_PATH]) {
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // ignore
    }
  }
}

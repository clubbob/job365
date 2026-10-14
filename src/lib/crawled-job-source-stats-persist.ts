import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import type { DiscoveredAffiliate } from '@/types/crawled-job';

export const CRAWLED_SOURCE_STATS_CACHE_PATH = resolve(process.cwd(), 'data/crawled-source-stats-cache.json');

/** 개발·관리자 화면 — 메모리 TTL보다 길게 두어 재시작 후에도 빠르게 복구 */
export const CRAWLED_SOURCE_STATS_DISK_TTL_MS = 300_000;

export type PersistedCrawledJobSourceStats = {
  version: 1;
  cachedAt: number;
  cacheKey: string;
  jobCountsBySource: Record<string, number>;
  discoveredBySource: Record<string, DiscoveredAffiliate[]>;
  recruitingEmployerCountByNorm: Record<string, number>;
};

export function readPersistedCrawledJobSourceStats(
  cacheKey: string,
): PersistedCrawledJobSourceStats | null {
  if (!existsSync(CRAWLED_SOURCE_STATS_CACHE_PATH)) return null;

  try {
    const raw = JSON.parse(readFileSync(CRAWLED_SOURCE_STATS_CACHE_PATH, 'utf8')) as PersistedCrawledJobSourceStats;
    if (raw?.version !== 1 || raw.cacheKey !== cacheKey) return null;
    if (Date.now() - raw.cachedAt > CRAWLED_SOURCE_STATS_DISK_TTL_MS) return null;
    if (!raw.jobCountsBySource || !raw.discoveredBySource || !raw.recruitingEmployerCountByNorm) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writePersistedCrawledJobSourceStats(payload: PersistedCrawledJobSourceStats): void {
  try {
    writeFileSync(CRAWLED_SOURCE_STATS_CACHE_PATH, stringifyJsonSafe(payload), 'utf8');
  } catch (error) {
    console.warn('[crawled-jobs] failed to persist source stats cache', error);
  }
}

export function clearPersistedCrawledJobSourceStats(): void {
  try {
    if (existsSync(CRAWLED_SOURCE_STATS_CACHE_PATH)) unlinkSync(CRAWLED_SOURCE_STATS_CACHE_PATH);
  } catch {
    // ignore
  }
}

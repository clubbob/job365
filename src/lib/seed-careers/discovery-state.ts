import { readFileSync, writeFileSync } from 'node:fs';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { seedCareersDiscoveryStatePath } from '@/lib/seed-careers/paths';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';
import type { SeedCareersDiscoveryEntry } from '@/lib/seed-careers/types';

export type SeedCareersDiscoveryStateFile = {
  version: 1;
  updatedAt: string;
  entries: Record<string, SeedCareersDiscoveryEntry>;
};

export function loadSeedCareersDiscoveryState(segment: SeedCareersSegment): SeedCareersDiscoveryStateFile {
  try {
    const raw = JSON.parse(readFileSync(seedCareersDiscoveryStatePath(segment), 'utf8')) as SeedCareersDiscoveryStateFile;
    if (raw?.version === 1 && raw.entries && typeof raw.entries === 'object') {
      return raw;
    }
  } catch {
    // empty
  }
  return { version: 1, updatedAt: '', entries: {} };
}

export function saveSeedCareersDiscoveryState(
  segment: SeedCareersSegment,
  entries: Record<string, SeedCareersDiscoveryEntry>,
): void {
  const payload: SeedCareersDiscoveryStateFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  };
  writeFileSync(seedCareersDiscoveryStatePath(segment), stringifyJsonSafe(payload), 'utf8');
}

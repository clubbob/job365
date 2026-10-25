import { resolve } from 'node:path';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';

function segmentSlug(segment: SeedCareersSegment): string {
  return segment === 'it' ? 'it-seed' : 'semi-seed';
}

export function seedCareersTargetsPath(segment: SeedCareersSegment): string {
  return resolve(process.cwd(), `data/${segmentSlug(segment)}-crawl-targets.json`);
}

export function seedCareersDiscoveryStatePath(segment: SeedCareersSegment): string {
  return resolve(process.cwd(), `data/${segmentSlug(segment)}-discovery-state.json`);
}

export function seedCareersRegistryDbPath(segment: SeedCareersSegment): string {
  return resolve(process.cwd(), `data/${segmentSlug(segment)}-registry-db.json`);
}

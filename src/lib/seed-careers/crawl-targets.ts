import { readFileSync } from 'node:fs';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';
import { seedCareersTargetsPath } from '@/lib/seed-careers/paths';
import type { SeedCareersTarget } from '@/lib/seed-careers/types';

type TargetsFile = {
  version: number;
  targets: SeedCareersTarget[];
};

export function loadSeedCareersCrawlTargets(segment: SeedCareersSegment): SeedCareersTarget[] {
  try {
    const raw = JSON.parse(readFileSync(seedCareersTargetsPath(segment), 'utf8')) as TargetsFile;
    if (!raw || !Array.isArray(raw.targets)) return [];
    return raw.targets.filter(
      (item) =>
        item &&
        typeof item.name === 'string' &&
        typeof item.careersUrl === 'string' &&
        item.careersUrl.trim() &&
        typeof item.crawlSourceId === 'string',
    );
  } catch {
    return [];
  }
}

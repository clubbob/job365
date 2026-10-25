import { createHash } from 'node:crypto';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';

export function seedCareersCrawlSourceId(segment: SeedCareersSegment, companyName: string): string {
  const prefix = segment === 'it' ? 'it-seed' : 'semi-seed';
  const hash = createHash('sha1').update(companyName.trim()).digest('hex').slice(0, 12);
  return `${prefix}-${hash}`;
}

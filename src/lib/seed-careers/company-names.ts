import { MASTER_IT_COMPANY_SEED_NAMES } from '@/lib/it-companies/master-seed';
import { MASTER_SEMI_DISPLAY_EQUIPMENT_SEED_NAMES } from '@/lib/semi-display-equipment/master-seed';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';

export function listSeedCareersCompanyNames(segment: SeedCareersSegment): string[] {
  return segment === 'it'
    ? [...MASTER_IT_COMPANY_SEED_NAMES]
    : [...MASTER_SEMI_DISPLAY_EQUIPMENT_SEED_NAMES];
}

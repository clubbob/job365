import { masterSeedNormalizeKey } from '@/lib/it-companies/master-seed';
import { semiEquipmentSeedNormalizeKey } from '@/lib/semi-display-equipment/master-seed';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';

export function seedCareersNormalizeKey(segment: SeedCareersSegment, companyName: string): string {
  return segment === 'it'
    ? masterSeedNormalizeKey(companyName)
    : semiEquipmentSeedNormalizeKey(companyName);
}

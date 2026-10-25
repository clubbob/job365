import {
  MASTER_SEMI_DISPLAY_EQUIPMENT_SEED_NAMES,
  semiEquipmentSeedNormalizeKey,
} from '@/lib/semi-display-equipment/master-seed';

const FAME_UNKNOWN_BASE = 30_000;

const SEED_FAME_INDEX = new Map(
  MASTER_SEMI_DISPLAY_EQUIPMENT_SEED_NAMES.map((name, index) => [
    semiEquipmentSeedNormalizeKey(name),
    index,
  ]),
);

export function semiDisplayEquipmentFameRank(
  companyName: string,
  activeJobCount = 0,
): number {
  const index = SEED_FAME_INDEX.get(semiEquipmentSeedNormalizeKey(companyName));
  if (index !== undefined) return 400 + index;

  const jobs = Math.max(0, Math.min(activeJobCount, 9_999));
  return FAME_UNKNOWN_BASE + (9_999 - jobs);
}

export function compareSemiDisplayEquipmentCompaniesByFame<
  T extends { companyName: string; activeJobCount: number },
>(a: T, b: T): number {
  const rankA = semiDisplayEquipmentFameRank(a.companyName, a.activeJobCount);
  const rankB = semiDisplayEquipmentFameRank(b.companyName, b.activeJobCount);
  if (rankA !== rankB) return rankA - rankB;
  return a.companyName.localeCompare(b.companyName, 'ko');
}

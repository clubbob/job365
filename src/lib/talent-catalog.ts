import { listMyTalentProfiles } from '@/lib/my-talent-profile';
import { SAMPLE_TALENTS } from '@/lib/sample-talents';
import { talentRecentDate } from '@/lib/talent-display';
import type { TalentProfile } from '@/types/talent';

export function listTalents(): TalentProfile[] {
  const mine = listMyTalentProfiles();
  const mineIds = new Set(mine.map((item) => item.id));
  const rest = SAMPLE_TALENTS.filter((item) => !mineIds.has(item.id));
  return [...mine, ...rest].sort((a, b) => talentRecentDate(b).localeCompare(talentRecentDate(a)));
}

export function getTalentById(id: string): TalentProfile | undefined {
  return listTalents().find((item) => item.id === id);
}

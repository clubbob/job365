import { listMyTalentProfilesWithOwners } from '@/lib/my-talent-profile';
import { SAMPLE_TALENTS } from '@/lib/sample-talents';
import { isTalentHiddenFromViewer } from '@/lib/resume-view-blocks';
import { talentRecentDate } from '@/lib/talent-display';
import { isWorkPreferencesComplete } from '@/lib/work-preferences';
import { isPublishedTalent, type TalentProfile } from '@/types/talent';

export function listTalents(viewerId?: string): TalentProfile[] {
  const mine = listMyTalentProfilesWithOwners()
    .filter(({ userId, profile }) => isPublishedTalent(profile) && isWorkPreferencesComplete(userId))
    .map(({ profile }) => profile);
  const mineIds = new Set(mine.map((item) => item.id));
  const rest = SAMPLE_TALENTS.filter((item) => !mineIds.has(item.id));
  const all = [...mine, ...rest].sort((a, b) => talentRecentDate(b).localeCompare(talentRecentDate(a)));
  if (!viewerId) return all;
  return all.filter((talent) => !isTalentHiddenFromViewer(talent.id, viewerId));
}

export function getTalentById(id: string, viewerId?: string): TalentProfile | undefined {
  return listTalents(viewerId).find((item) => item.id === id);
}

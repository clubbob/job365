import { listMyTalentProfilesWithOwners } from '@/lib/my-talent-profile';
import { isTalentHiddenFromViewer } from '@/lib/resume-view-blocks';
import { talentRecentDate } from '@/lib/talent-display';
import { isPublishedTalent, type TalentProfile } from '@/types/talent';

export function listTalents(viewerId?: string): TalentProfile[] {
  const all = listMyTalentProfilesWithOwners()
    .filter(({ profile }) => isPublishedTalent(profile))
    .map(({ profile }) => profile)
    .sort((a, b) => talentRecentDate(b).localeCompare(talentRecentDate(a)));
  if (!viewerId) return all;
  return all.filter((talent) => !isTalentHiddenFromViewer(talent.id, viewerId));
}

export function getTalentById(id: string, viewerId?: string): TalentProfile | undefined {
  return listTalents(viewerId).find((item) => item.id === id);
}

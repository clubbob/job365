import type { TalentProfile } from '@/types/talent';

export function maskTalentName(name: string): string {
  const chars = Array.from(name.trim());
  if (chars.length <= 1) return chars[0] ?? '';
  return `${chars[0]}${'*'.repeat(chars.length - 1)}`;
}

export function displayTalentName(name: string, revealed: boolean): string {
  return revealed ? name : maskTalentName(name);
}

export function talentRecentDate(talent: Pick<TalentProfile, 'createdAt' | 'updatedAt'>): string {
  return talent.updatedAt || talent.createdAt;
}

export function talentEducation(talent: Pick<TalentProfile, 'education'>): string {
  return talent.education;
}

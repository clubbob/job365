import { formatBirthDate, privateContactValue } from '@/lib/talent-contact';
import { WORK_TYPE_LABELS, type JobWorkType } from '@/types/job';
import { normalizeEducation, type TalentProfile } from '@/types/talent';

export function talentWorkTypeLabel(workType: JobWorkType | ''): string {
  return workType ? WORK_TYPE_LABELS[workType] : '미입력';
}

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
  return normalizeEducation(talent.education) || talent.education || '미입력';
}

export function talentBasicInfoItems(
  talent: TalentProfile,
  revealed: boolean,
): Array<{ label: string; value?: string | null }> {
  return [
    { label: '이름', value: displayTalentName(talent.name, revealed) },
    { label: '생년월일', value: privateContactValue(formatBirthDate(talent.birthDate), revealed) },
    { label: '성별', value: talent.gender || '—' },
    { label: '휴대폰', value: privateContactValue(talent.phone, revealed) },
    { label: '이메일', value: privateContactValue(talent.email, revealed) },
    { label: '주소', value: privateContactValue(talent.address, revealed) },
    { label: '홈페이지 / SNS', value: talent.homepage || '—' },
    { label: '직무', value: talent.headline },
  ];
}

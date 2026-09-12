import { isCompleteResidence, parseResidence } from '@/lib/korea-regions';
import { JOB_EDUCATION_OPTIONS, isJobEducation, isJobWorkType, type JobEducation, type JobPayType, type JobWorkType } from '@/types/job';

export const EDUCATION_OPTIONS = JOB_EDUCATION_OPTIONS;
export type EducationLevel = JobEducation;

export function isEducationLevel(value: unknown): value is EducationLevel {
  return typeof value === 'string' && isJobEducation(value);
}

const LEGACY_EDUCATION: Record<string, EducationLevel> = {
  '고등학교 재학': '고등학교 졸업 이상',
  '고등학교 졸업': '고등학교 졸업 이상',
  '전문대학 재학': '전문대학 졸업 이상',
  '전문대학 졸업': '전문대학 졸업 이상',
  '대학교 재학': '대학교 졸업 이상',
  '대학교 졸업': '대학교 졸업 이상',
  '석사 재학': '석사 이상',
  '석사 졸업': '석사 이상',
  '박사 재학': '박사 이상',
  '박사 졸업': '박사 이상',
};

export function normalizeEducation(value: unknown): EducationLevel | '' {
  if (typeof value !== 'string' || value === '학력무관') return '';
  if (isEducationLevel(value)) return value;
  return LEGACY_EDUCATION[value] ?? '';
}

export const TALENT_GENDERS = ['남', '여'] as const;
export type TalentGender = (typeof TALENT_GENDERS)[number];

export function isTalentGender(value: unknown): value is TalentGender {
  return value === '남' || value === '여';
}

export type TalentProfile = {
  id: string;
  title: string;
  name: string;
  headline: string;
  workType: JobWorkType | '';
  workTypes?: JobWorkType[];
  careerLabel: string;
  education: EducationLevel | '';
  location: string;
  desiredPay: string;
  payType?: JobPayType;
  payAmount?: string;
  payNegotiable?: boolean;
  summary: string;
  experience: string;
  available: string;
  tags: string[];
  photoUrl?: string;
  birthDate?: string;
  gender?: TalentGender;
  phone?: string;
  email?: string;
  address?: string;
  homepage?: string;
  school?: string;
  major?: string;
  careerHistory?: string;
  languages?: string;
  createdAt: string;
  updatedAt: string;
  draft?: boolean;
};

export function talentWorkTypes(profile: Pick<TalentProfile, 'workType' | 'workTypes'>): JobWorkType[] {
  const fromList = profile.workTypes?.filter(isJobWorkType) ?? [];
  if (fromList.length > 0) return [...new Set(fromList)];
  return isJobWorkType(profile.workType) ? [profile.workType] : [];
}

export function missingTalentPublishFields(profile: TalentProfile): string[] {
  const missing: string[] = [];
  const residence = parseResidence(profile.address ?? '');
  if (!profile.title?.trim()) missing.push('이력서 제목');
  if (!profile.name?.trim()) missing.push('이름');
  if (!profile.birthDate?.trim()) missing.push('생년월');
  if (!isTalentGender(profile.gender)) missing.push('성별');
  if (!profile.phone?.trim()) missing.push('휴대폰');
  if (!profile.email?.trim()) missing.push('이메일');
  if (!isCompleteResidence(residence.city, residence.district)) missing.push('거주 지역');
  if (talentWorkTypes(profile).length === 0) missing.push('근무 형태');
  if (!profile.careerLabel?.trim() || profile.careerLabel.trim() === '경력무관') missing.push('경력 유무');
  if (!isEducationLevel(profile.education)) missing.push('최종 학력');
  if (!profile.school?.trim()) missing.push('학교');
  if (!profile.summary?.trim()) missing.push('자기 소개');
  return missing;
}

export function isCompleteTalentProfile(profile: TalentProfile): boolean {
  return missingTalentPublishFields(profile).length === 0;
}

export function withSavedTalentState(profile: TalentProfile): TalentProfile {
  if (!isCompleteTalentProfile(profile)) return { ...profile, draft: true };
  return { ...profile, draft: profile.draft === false ? false : true };
}

export function withTalentPublishState(profile: TalentProfile): TalentProfile {
  return withSavedTalentState(profile);
}

export function isPublishedTalent(profile: TalentProfile): boolean {
  return profile.draft === false && isCompleteTalentProfile(profile);
}

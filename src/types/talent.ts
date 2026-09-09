import { JOB_EDUCATION_OPTIONS, isJobEducation, type JobEducation, type JobPayType, type JobWorkType } from '@/types/job';

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
  if (typeof value !== 'string') return '';
  if (isEducationLevel(value)) return value;
  return LEGACY_EDUCATION[value] ?? '';
}

export type TalentProfile = {
  id: string;
  name: string;
  headline: string;
  workType: JobWorkType;
  careerLabel: string;
  education: EducationLevel;
  location: string;
  desiredPay: string;
  payType?: JobPayType;
  payAmount?: string;
  payNegotiable?: boolean;
  summary: string;
  experience: string;
  available: string;
  tags: string[];
  school?: string;
  major?: string;
  careerHistory?: string;
  languages?: string;
  portfolioUrl?: string;
  createdAt: string;
  updatedAt: string;
};

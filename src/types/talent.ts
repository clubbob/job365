import type { JobWorkType } from '@/types/job';

export const EDUCATION_OPTIONS = [
  '고등학교 재학',
  '고등학교 졸업',
  '전문대학 재학',
  '전문대학 졸업',
  '대학교 재학',
  '대학교 졸업',
  '석사 재학',
  '석사 졸업',
  '박사 재학',
  '박사 졸업',
] as const;

export type EducationLevel = (typeof EDUCATION_OPTIONS)[number];

export function isEducationLevel(value: unknown): value is EducationLevel {
  return typeof value === 'string' && (EDUCATION_OPTIONS as readonly string[]).includes(value);
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
  summary: string;
  experience: string;
  available: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

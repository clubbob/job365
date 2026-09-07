import type { JobWorkType } from '@/types/job';

export type TalentProfile = {
  id: string;
  name: string;
  headline: string;
  workType: JobWorkType;
  careerLabel: string;
  location: string;
  desiredPay: string;
  summary: string;
  experience: string;
  available: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

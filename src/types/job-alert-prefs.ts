import type { CompanySize, EmploymentType, JobRegion, JobRole } from '@/lib/job-board/constants';

export type JobAlertPrefs = {
  userId: string;
  emailEnabled: boolean;
  employmentTypes: EmploymentType[];
  roles: JobRole[];
  regions: JobRegion[];
  companySizes: CompanySize[];
  updatedAt: string | null;
};

export const DEFAULT_JOB_ALERT_PREFS: Omit<JobAlertPrefs, 'userId' | 'updatedAt'> = {
  emailEnabled: true,
  employmentTypes: [],
  roles: [],
  regions: [],
  companySizes: [],
};

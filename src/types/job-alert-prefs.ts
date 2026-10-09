import type { EmploymentType, JobRegion, JobRole } from '@/lib/job-board/constants';

export type JobAlertPrefs = {
  userId: string;
  emailEnabled: boolean;
  employmentTypes: EmploymentType[];
  roles: JobRole[];
  regions: JobRegion[];
  updatedAt: string | null;
};

export const DEFAULT_JOB_ALERT_PREFS: Omit<JobAlertPrefs, 'userId' | 'updatedAt'> = {
  emailEnabled: false,
  employmentTypes: [],
  roles: [],
  regions: [],
};

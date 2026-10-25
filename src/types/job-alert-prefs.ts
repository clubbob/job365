import type { EmploymentType, JobRegion, JobRole } from '@/lib/job-board/constants';
import type { JobBoardCompanySegment } from '@/lib/job-board/company-segment';

export type JobAlertPrefs = {
  userId: string;
  emailEnabled: boolean;
  employmentTypes: EmploymentType[];
  companySegments: JobBoardCompanySegment[];
  roles: JobRole[];
  regions: JobRegion[];
  updatedAt: string | null;
};

export const DEFAULT_JOB_ALERT_PREFS: Omit<JobAlertPrefs, 'userId' | 'updatedAt'> = {
  emailEnabled: false,
  employmentTypes: [],
  companySegments: [],
  roles: [],
  regions: [],
};

/** API·Firestore에 필드가 없을 때(구 설정) 클라이언트 런타임 오류 방지 */
export function normalizeJobAlertPrefs(prefs: JobAlertPrefs): JobAlertPrefs {
  return {
    userId: prefs.userId,
    updatedAt: prefs.updatedAt ?? null,
    emailEnabled: prefs.emailEnabled ?? DEFAULT_JOB_ALERT_PREFS.emailEnabled,
    employmentTypes: Array.isArray(prefs.employmentTypes) ? prefs.employmentTypes : [],
    companySegments: Array.isArray(prefs.companySegments) ? prefs.companySegments : [],
    roles: Array.isArray(prefs.roles) ? prefs.roles : [],
    regions: Array.isArray(prefs.regions) ? prefs.regions : [],
  };
}

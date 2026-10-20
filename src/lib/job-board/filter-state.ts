import type { EmploymentType, JobRegion, JobRole } from '@/lib/job-board/constants';
import type { JobBoardCompanySegment } from '@/lib/job-board/company-segment';

export type JobBoardFilterState = {
  q: string;
  employmentTypes: EmploymentType[];
  companySegments: JobBoardCompanySegment[];
  roles: JobRole[];
  regions: JobRegion[];
};

export const EMPTY_JOB_BOARD_FILTERS: JobBoardFilterState = {
  q: '',
  employmentTypes: [],
  companySegments: [],
  roles: [],
  regions: [],
};

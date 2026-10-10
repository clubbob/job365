import type { CompanySize, EmploymentType, JobRegion, JobRole } from '@/lib/job-board/constants';

export type CrawledJobStatus = 'active' | 'closed';

export type CrawledJob = {
  id: string;
  sourceId: string;
  sourceName: string;
  companyName: string;
  title: string;
  employmentTypes: EmploymentType[];
  roles: JobRole[];
  regions: JobRegion[];
  companySize: CompanySize;
  headcount: string | null;
  deadline: string | null;
  applyUrl: string;
  description: string;
  status: CrawledJobStatus;
  crawledAt: string;
  createdAt: string;
  closedAt: string | null;
  /** Firestore: 목록 노출 가능(수집 시 isBrowsableCrawledJob 결과) */
  showInJobBoard?: boolean;
};

export type DiscoveredAffiliate = {
  companyName: string;
  activeJobCount: number;
  crawlDisabled?: boolean;
  displayDisabled?: boolean;
  reason?: string | null;
};

export type CrawledJobListItem = Pick<
  CrawledJob,
  | 'id'
  | 'sourceName'
  | 'companyName'
  | 'title'
  | 'employmentTypes'
  | 'roles'
  | 'regions'
  | 'companySize'
  | 'deadline'
  | 'applyUrl'
  | 'status'
  | 'crawledAt'
  | 'createdAt'
>;

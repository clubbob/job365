export type JobWorkType =
  | 'fulltime'
  | 'contract'
  | 'intern'
  | 'freelance'
  | 'parttime'
  | 'dispatch'
  | 'project';
export type JobPayType = 'hourly' | 'daily' | 'monthly' | 'per_task';
export type JobStatus = 'draft' | 'pending' | 'published' | 'closed' | 'rejected';

export type JobPosting = {
  id: string;
  title: string;
  companyName: string;
  workType: JobWorkType;
  payType: JobPayType;
  payLabel: string;
  location: string;
  summary: string;
  tags: string[];
  createdAt: string;
};

export const WORK_TYPE_LABELS: Record<JobWorkType, string> = {
  fulltime: '정규직',
  contract: '계약직',
  intern: '인턴',
  freelance: '프리랜서',
  parttime: '파트타임',
  dispatch: '파견·도급',
  project: '프로젝트',
};

export const WORK_TYPE_FILTERS: Array<{
  id: 'all' | JobWorkType;
  label: string;
  types: JobWorkType[] | null;
}> = [
  { id: 'all', label: '전체', types: null },
  { id: 'fulltime', label: '정규직', types: ['fulltime'] },
  { id: 'contract', label: '계약직', types: ['contract'] },
  { id: 'intern', label: '인턴', types: ['intern'] },
  { id: 'freelance', label: '프리랜서', types: ['freelance'] },
  { id: 'parttime', label: '파트타임', types: ['parttime'] },
  { id: 'dispatch', label: '파견·도급', types: ['dispatch'] },
  { id: 'project', label: '프로젝트', types: ['project'] },
];

export const PAY_TYPE_LABELS: Record<JobPayType, string> = {
  hourly: '시급',
  daily: '일급',
  monthly: '월급',
  per_task: '건별',
};

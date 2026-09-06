export type JobWorkType = 'remote' | 'freelance' | 'parttime' | 'short';
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
  remote: '재택',
  freelance: '프리랜서',
  parttime: '알바',
  short: '알바',
};

export const WORK_TYPE_FILTERS: Array<{
  id: 'all' | 'parttime' | 'remote' | 'freelance';
  label: string;
  types: JobWorkType[] | null;
}> = [
  { id: 'all', label: '전체', types: null },
  { id: 'parttime', label: '알바', types: ['parttime', 'short'] },
  { id: 'remote', label: '재택', types: ['remote'] },
  { id: 'freelance', label: '프리랜서', types: ['freelance'] },
];

export const PAY_TYPE_LABELS: Record<JobPayType, string> = {
  hourly: '시급',
  daily: '일급',
  monthly: '월급',
  per_task: '건별',
};

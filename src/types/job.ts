export type JobWorkType =
  | 'fulltime'
  | 'contract'
  | 'intern'
  | 'freelance'
  | 'parttime'
  | 'dispatch'
  | 'commission'
  | 'military'
  | 'project';
export type JobPayType = 'hourly' | 'daily' | 'monthly' | 'yearly' | 'per_task';
export type JobCareerType = 'new' | 'experienced' | 'any';
export type JobStatus = 'draft' | 'pending' | 'published' | 'closed' | 'rejected';

export const JOB_EDUCATION_OPTIONS = [
  '고등학교 졸업 이상',
  '전문대학 졸업 이상',
  '대학교 졸업 이상',
  '석사 이상',
  '박사 이상',
] as const;

export type JobEducation = (typeof JOB_EDUCATION_OPTIONS)[number];

export type JobPosting = {
  id: string;
  title: string;
  companyName: string;
  workType: JobWorkType;
  workTypes?: JobWorkType[];
  payType: JobPayType;
  payLabel: string;
  location: string;
  summary: string;
  createdAt: string;
  businessNumber?: string;
  headcount?: number;
  careerType?: JobCareerType | string;
  careerMinYears?: number;
  education?: JobEducation | string;
  workHours?: string;
  workDays?: string;
  positionLevel?: string;
  probation?: string;
  process?: string;
  deadline?: string;
  payAmount?: string;
  payNegotiable?: boolean;
  requirements?: string;
  preferred?: string;
  benefits?: string;
  status?: JobStatus;
  company?: JobCompanyInfo;
};

export type JobCompanyInfo = {
  companyName?: string;
  businessNumber?: string;
  ceo?: string;
  address?: string;
  phone?: string;
  fax?: string;
  foundedOn?: string;
  employeeCount?: string;
  lastYearRevenue?: string;
  website?: string;
  intro?: string;
  registrantName?: string;
  registrantEmail?: string;
};

export function isJobStatus(value: string): value is JobStatus {
  return value === 'draft' || value === 'pending' || value === 'published' || value === 'closed' || value === 'rejected';
}

export function isPublishedJob(job: Pick<JobPosting, 'status'>): boolean {
  return !job.status || job.status === 'published';
}

export const WORK_TYPE_LABELS: Record<JobWorkType, string> = {
  fulltime: '정규직',
  contract: '계약직',
  intern: '인턴',
  freelance: '프리랜서',
  parttime: '알바',
  dispatch: '파견직',
  commission: '위촉직',
  military: '병역특례',
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
  { id: 'parttime', label: '알바', types: ['parttime'] },
  { id: 'dispatch', label: '파견직', types: ['dispatch'] },
  { id: 'commission', label: '위촉직', types: ['commission'] },
  { id: 'military', label: '병역특례', types: ['military'] },
  { id: 'project', label: '프로젝트', types: ['project'] },
];

export const JOB_WORK_TYPES = WORK_TYPE_FILTERS.flatMap((item) =>
  item.id === 'all' ? [] : [item.id],
);

export function isJobWorkType(value: string): value is JobWorkType {
  return JOB_WORK_TYPES.includes(value as JobWorkType);
}

export function jobWorkTypes(job: Pick<JobPosting, 'workType' | 'workTypes'>): JobWorkType[] {
  const fromList = [...new Set((job.workTypes ?? []).filter(isJobWorkType))];
  if (fromList.length > 0) return JOB_WORK_TYPES.filter((item) => fromList.includes(item));
  return isJobWorkType(job.workType) ? [job.workType] : [];
}

export function jobWorkTypesLabel(job: Pick<JobPosting, 'workType' | 'workTypes'>): string {
  return jobWorkTypes(job)
    .map((item) => WORK_TYPE_LABELS[item])
    .join(', ');
}

export function jobMatchesWorkType(job: Pick<JobPosting, 'workType' | 'workTypes'>, workType: JobWorkType): boolean {
  return jobWorkTypes(job).includes(workType);
}

export function isJobPayType(value: string): value is JobPayType {
  return value in PAY_TYPE_LABELS;
}

export function isJobCareerType(value: string): value is JobCareerType {
  return value in CAREER_TYPE_LABELS;
}

export function isJobEducation(value: string): value is JobEducation {
  return (JOB_EDUCATION_OPTIONS as readonly string[]).includes(value);
}

export const PAY_TYPE_LABELS: Record<JobPayType, string> = {
  hourly: '시급',
  daily: '일급',
  monthly: '월급',
  yearly: '연봉',
  per_task: '건별',
};

export const CAREER_TYPE_LABELS: Record<JobCareerType, string> = {
  new: '신입',
  experienced: '경력',
  any: '경력 무관',
};

export const JOB_CAREER_TYPES = Object.keys(CAREER_TYPE_LABELS) as JobCareerType[];
export const JOBSEEKER_CAREER_TYPES: JobCareerType[] = ['new', 'experienced'];

export function formatCareerYearsInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

export function parseCareerYears(value: string | number | undefined): number | null {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 2);
  if (!digits) return null;
  const years = Number(digits);
  if (!Number.isFinite(years) || years < 1) return null;
  return Math.min(99, years);
}

export const JOB_POSITION_OPTIONS = [
  '사원',
  '주임·계장',
  '대리',
  '과장',
  '차장',
  '부장',
  '임원',
  '직급 무관',
] as const;

export function jobPositionLabel(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  return value === '직급무관' ? '직급 무관' : value;
}

export const JOB_PROBATION_OPTIONS = ['없음', '1개월', '2개월', '3개월', '6개월', '협의'] as const;

export const JOB_WORK_DAY_OPTIONS = [
  '주 5일(월~금)',
  '주 6일',
  '주 3일',
  '주말',
  '교대근무',
  '요일협의',
] as const;

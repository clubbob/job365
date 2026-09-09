export type JobWorkType =
  | 'fulltime'
  | 'contract'
  | 'intern'
  | 'freelance'
  | 'parttime'
  | 'dispatch'
  | 'project';
export type JobPayType = 'hourly' | 'daily' | 'monthly' | 'yearly' | 'per_task';
export type JobCareerType = 'new' | 'experienced' | 'any';
export type JobStatus = 'draft' | 'pending' | 'published' | 'closed' | 'rejected';

export const JOB_EDUCATION_OPTIONS = [
  '학력무관',
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
  payType: JobPayType;
  payLabel: string;
  location: string;
  summary: string;
  createdAt: string;
  businessNumber?: string;
  headcount?: number;
  careerType?: JobCareerType;
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

export const JOB_WORK_TYPES = WORK_TYPE_FILTERS.flatMap((item) =>
  item.id === 'all' ? [] : [item.id],
);

export function isJobWorkType(value: string): value is JobWorkType {
  return JOB_WORK_TYPES.includes(value as JobWorkType);
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
  any: '경력무관',
};

export const JOB_CAREER_TYPES = Object.keys(CAREER_TYPE_LABELS) as JobCareerType[];

export const JOB_POSITION_OPTIONS = [
  '직급무관',
  '사원',
  '주임·계장',
  '대리',
  '과장',
  '차장',
  '부장',
  '임원',
] as const;

export const JOB_PROBATION_OPTIONS = ['없음', '1개월', '2개월', '3개월', '6개월', '협의'] as const;

export const JOB_WORK_DAY_OPTIONS = [
  '주 5일(월~금)',
  '주 6일',
  '주 3일',
  '주말',
  '교대근무',
  '요일협의',
] as const;

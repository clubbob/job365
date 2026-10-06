/** 채용 형태 — 수신 설정·상세 필터·공고 태그 공통 */
export const EMPLOYMENT_TYPES = ['신입', '경력', '인턴', '계약직', '기타'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const QUICK_FILTER_OPTIONS = [
  { id: 'all', label: '전체' },
  { id: '신입', label: '신입' },
  { id: '경력', label: '경력' },
  { id: '인턴', label: '인턴' },
  { id: '계약직', label: '계약직' },
] as const;
export type QuickFilterId = (typeof QUICK_FILTER_OPTIONS)[number]['id'];

/** 빠른 필터·수신 설정 채용 형태 (전체 제외) */
export const QUICK_EMPLOYMENT_TYPES = QUICK_FILTER_OPTIONS.filter(
  (item) => item.id !== 'all',
).map((item) => item.id) as [EmploymentType, EmploymentType, EmploymentType, EmploymentType];

/** 관심 직무 */
export const JOB_ROLES = [
  'IT·개발',
  '기획·PM',
  '디자인',
  '마케팅·광고',
  '영업·판매',
  '경영·사무',
  '생산·제조',
  '연구·개발',
  '금융·회계',
  '교육',
  '서비스·고객 관리',
  '기타',
] as const;
export type JobRole = (typeof JOB_ROLES)[number];

/** 희망 지역 */
export const JOB_REGIONS = [
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '광주',
  '대전',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
  '재택',
] as const;
export type JobRegion = (typeof JOB_REGIONS)[number];

/** 기업 규모 */
export const COMPANY_SIZES = [
  '대기업',
  '중견기업',
  '중소기업',
  '스타트업',
  '공공기관',
  '외국계',
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

/** 3열 × 3행 */
export const JOB_LIST_PAGE_SIZE = 9;

/** 메인 페이지 초기 노출 (3열 × 2행) */
export const JOB_HOME_PAGE_SIZE = 6;

export function isEmploymentType(value: string): value is EmploymentType {
  return (EMPLOYMENT_TYPES as readonly string[]).includes(value);
}

export function isJobRole(value: string): value is JobRole {
  return (JOB_ROLES as readonly string[]).includes(value);
}

export function isJobRegion(value: string): value is JobRegion {
  return (JOB_REGIONS as readonly string[]).includes(value);
}

export function isCompanySize(value: string): value is CompanySize {
  return (COMPANY_SIZES as readonly string[]).includes(value);
}

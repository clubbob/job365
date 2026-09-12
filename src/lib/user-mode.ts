export type UserMode = 'jobseeker' | 'recruiter';

const USER_MODE_KEY = 'job365.userMode';

export const USER_MODE_LABELS: Record<UserMode, string> = {
  jobseeker: '구직자 (취업 개인)',
  recruiter: '구인자 (채용 회사)',
};

export const USER_MODE_SHORT_LABELS: Record<UserMode, string> = {
  jobseeker: '구직자',
  recruiter: '구인자',
};

export const USER_MODE_PATHS: Record<UserMode, string> = {
  jobseeker: '/',
  recruiter: '/',
};

export const HEADER_NAV_JOBS = { href: '/jobs', label: '채용 정보', exact: false } as const;
export const HEADER_NAV_TALENTS = { href: '/talents', label: '인재 정보', exact: false } as const;

export type HeaderNavItem = typeof HEADER_NAV_JOBS | typeof HEADER_NAV_TALENTS;

export function getHeaderNavItems(mode: UserMode | null): HeaderNavItem[] {
  if (mode === 'jobseeker') return [HEADER_NAV_JOBS];
  if (mode === 'recruiter') return [HEADER_NAV_TALENTS];
  return [];
}

export function clearUserMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_MODE_KEY);
}

export function isUserMode(value: unknown): value is UserMode {
  return value === 'jobseeker' || value === 'recruiter';
}

export function loadUserMode(): UserMode | null {
  if (typeof window === 'undefined') return null;
  return isUserMode(localStorage.getItem(USER_MODE_KEY))
    ? (localStorage.getItem(USER_MODE_KEY) as UserMode)
    : null;
}

export function saveUserMode(mode: UserMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_MODE_KEY, mode);
}

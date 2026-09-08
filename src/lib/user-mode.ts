export type UserMode = 'jobseeker' | 'recruiter';

const USER_MODE_KEY = 'job365.userMode';

export const USER_MODE_LABELS: Record<UserMode, string> = {
  jobseeker: '구직자 (취업개인)',
  recruiter: '구인자 (채용회사)',
};

export const USER_MODE_PATHS: Record<UserMode, string> = {
  jobseeker: '/',
  recruiter: '/',
};

export function getModeRegisterAction(
  mode: UserMode | null,
): { href: string; label: string } | null {
  if (mode === 'recruiter') return { href: '/jobs/new', label: '채용 정보 등록' };
  if (mode === 'jobseeker') return { href: '/mypage#resume', label: '이력서 등록' };
  return null;
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

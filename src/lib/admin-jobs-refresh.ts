export const ADMIN_JOBS_REFRESH_EVENT = 'job365-admin-jobs-refresh';

export function requestAdminJobsRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_JOBS_REFRESH_EVENT));
}

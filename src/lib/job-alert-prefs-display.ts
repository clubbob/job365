import { hasJobAlertFilterPrefs } from '@/lib/job-board/match';
import type { JobAlertPrefs } from '@/types/job-alert-prefs';

export function formatJobAlertPrefsSummary(
  prefs: Pick<JobAlertPrefs, 'emailEnabled' | 'employmentTypes' | 'roles' | 'regions'>,
  saved: boolean,
): string {
  const emailLabel = prefs.emailEnabled ? '이메일 받음' : '이메일 안 받음';

  if (!saved && !hasJobAlertFilterPrefs(prefs) && prefs.emailEnabled) {
    return '이메일 받음 · 조건 전체';
  }

  const filterLabel = hasJobAlertFilterPrefs(prefs)
    ? [...prefs.employmentTypes, ...prefs.roles, ...prefs.regions].join(', ')
    : '조건 전체';

  return `${emailLabel} · ${filterLabel}`;
}

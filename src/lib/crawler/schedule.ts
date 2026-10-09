/** Vercel cron은 UTC 기준입니다. 한국 06:00 = 전날 UTC 21:00 */
export const CRAWL_CRON_UTC = '0 21 * * *';

export const CRAWL_SCHEDULE = {
  timezone: 'Asia/Seoul',
  localTime: '06:00',
  cronUtc: CRAWL_CRON_UTC,
  label: '매일 06:00 (한국 시간), GitHub Actions 1회',
  /** 관리자·안내용. 자동 수집은 Vercel이 아니라 GitHub에서 돌아 서버 비용을 줄입니다. */
  detail:
    '대기업·계열 채용 사이트는 매일 전부 수집합니다. 중견기업은 연결된 채용 URL을 하루 900곳씩 순환해 7일 안에 전체 한 바퀴를 돕니다.',
  frequency: 'daily',
  runner: 'GitHub Actions',
  maxRunnerMinutes: 120,
  midSizedSitesPerRun: 900,
} as const;

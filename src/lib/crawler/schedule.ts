/** Vercel cron은 UTC 기준입니다. 한국 06:00 = 전날 UTC 21:00 */
export const CRAWL_CRON_UTC = '0 21 * * *';

export const CRAWL_SCHEDULE = {
  timezone: 'Asia/Seoul',
  localTime: '06:00',
  cronUtc: CRAWL_CRON_UTC,
  label: '매일 06:00 (한국 시간, 중견기업은 일별 배치 순환)',
  frequency: 'daily',
  /** 전체 수집은 수 분 걸려 Vercel 서버리스(최대 60초)로는 완료하기 어렵습니다. GitHub Actions에서 실행합니다. */
  runner: 'GitHub Actions',
} as const;

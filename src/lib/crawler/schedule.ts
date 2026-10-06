/** Vercel cron은 UTC 기준입니다. 한국 06:00 = 전날 UTC 21:00 */
export const CRAWL_CRON_UTC = '0 21 * * *';

export const CRAWL_SCHEDULE = {
  timezone: 'Asia/Seoul',
  localTime: '06:00',
  cronUtc: CRAWL_CRON_UTC,
  label: '매일 06:00 (한국 시간)',
  frequency: 'daily',
} as const;

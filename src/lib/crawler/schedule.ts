/** GitHub Actions cron(UTC). 한국 02:00 ≈ 전날 UTC 17:00, 매일 */
export const CRAWL_CRON_UTC = '0 17 * * *';

/** 수집 1회당 중견 채용 URL 순환 건수. GitHub Actions·코드 기본값과 맞춥니다. */
export const CRAWL_MID_SIZED_SITES_PER_RUN = 1000;

export const CRAWL_SCHEDULE = {
  timezone: 'Asia/Seoul',
  localTime: '02:00',
  cronUtc: CRAWL_CRON_UTC,
  label: '매일 02:00 (한국 시간), GitHub Actions',
  /** 관리자·안내용. 자동 수집은 Vercel이 아니라 GitHub에서 돌아 서버 비용을 줄입니다. */
  detail:
    '대기업·계열 채용 사이트와 별도 등록 소스는 수집할 때마다 전부 가져옵니다. 중견 기업은 연결된 채용 URL을 회당 1,000곳씩 순환해 약 5~6일에 한 바퀴를 돕니다.',
  frequency: 'daily',
  runner: 'GitHub Actions',
  maxRunnerMinutes: 180,
  midSizedSitesPerRun: CRAWL_MID_SIZED_SITES_PER_RUN,
  /** 로컬 「지금 수집 실행」 UI용 대략적 예상 시간(분). 실제와 다를 수 있습니다. */
  localManualRunEstimateMinutes: 70,
} as const;

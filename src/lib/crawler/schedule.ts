/** 주중 수집 요일(한국). GitHub Actions cron·안내 문구와 맞춥니다. */
export const CRAWL_WEEKDAYS_KO = '월·수·금';

/**
 * GitHub Actions cron(UTC).
 * 한국 월·수·금 02:00 = 전날 UTC 17:00(일·화·목). 요일이 UTC 기준이라 0,2,4입니다.
 */
export const CRAWL_CRON_UTC = '0 17 * * 0,2,4';

/** 회차 사이 일반적인 간격(일). 금→월은 3일입니다. */
export const CRAWL_INTERVAL_DAYS = 2;

/**
 * 수집 1회당 중견 채용 URL 순환 건수.
 * 주 3회 × 3,000곳 기준으로 명단을 순환합니다.
 */
export const CRAWL_MID_SIZED_SITES_PER_RUN = 3000;

const midPerRun = CRAWL_MID_SIZED_SITES_PER_RUN.toLocaleString('ko-KR');

export const CRAWL_SCHEDULE = {
  intervalDays: CRAWL_INTERVAL_DAYS,
  weekdaysKo: CRAWL_WEEKDAYS_KO,
  timezone: 'Asia/Seoul',
  localTime: '02:00',
  cronUtc: CRAWL_CRON_UTC,
  label: `매주 ${CRAWL_WEEKDAYS_KO} 02:00 (한국 시간), GitHub Actions`,
  /** 대기업·IT·장비 등 「수집 회차마다 전부」 안내 문구 */
  perRunFullCrawlLabel: '수집 회차마다 전체',
  detail:
    `대기업·IT 회사·반도체·디스플레이 장비사는 각 명단 DB에 연결된 채용 URL을 매주 ${CRAWL_WEEKDAYS_KO} 02:00 수집 때 전부 가져옵니다. 중견기업은 중견 DB에서 회차당 ${midPerRun}곳씩 순환해 약 4~5일에 한 바퀴를 돕니다.`,
  frequency: 'mwf',
  runner: 'GitHub Actions',
  maxRunnerMinutes: 180,
  midSizedSitesPerRun: CRAWL_MID_SIZED_SITES_PER_RUN,
  /** 로컬 「지금 수집 실행」 UI용 대략적 예상 시간(분). 실제와 다를 수 있습니다. */
  localManualRunEstimateMinutes: 80,
} as const;

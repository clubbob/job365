/** 주중 수집 요일(한국). GitHub Actions cron·안내 문구와 맞춥니다. */
export const CRAWL_WEEKDAYS_KO = '월·수·금';

/**
 * GitHub Actions cron(UTC).
 * 한국 월·수·금 00:00 = 전날 UTC 15:00(일·화·목). 요일이 UTC 기준이라 0,2,4입니다.
 */
export const CRAWL_CRON_UTC = '0 15 * * 0,2,4';

/** 회차 사이 일반적인 간격(일). 금→월은 3일입니다. */
export const CRAWL_INTERVAL_DAYS = 2;

/**
 * 수집 1회당 중견 채용 URL 순환 건수.
 * 2,000곳이면 회차가 3시간에 닿아 제한 시각에 끊깁니다.
 * 주 3회 × 1,000곳이면 그 안에 끝내고, 월·수·금마다 다음 1,000곳으로 이어 갑니다.
 */
export const CRAWL_MID_SIZED_SITES_PER_RUN = 1000;

const midPerRun = CRAWL_MID_SIZED_SITES_PER_RUN.toLocaleString('ko-KR');

export const CRAWL_SCHEDULE = {
  intervalDays: CRAWL_INTERVAL_DAYS,
  weekdaysKo: CRAWL_WEEKDAYS_KO,
  timezone: 'Asia/Seoul',
  localTime: '00:00',
  cronUtc: CRAWL_CRON_UTC,
  label: `매주 ${CRAWL_WEEKDAYS_KO} 00:00 (한국 시간), GitHub Actions`,
  /** 대기업·IT·장비 등 「수집 회차마다 전부」 안내 문구 */
  perRunFullCrawlLabel: '수집 회차마다 전체',
  detail:
    `대기업·IT 회사·반도체·디스플레이 회사는 각 명단 DB에 연결된 채용 URL을 매주 ${CRAWL_WEEKDAYS_KO} 00:00 수집 때 전부 가져옵니다. 중견기업은 중견 DB에서 회차당 ${midPerRun}곳씩 순환합니다.`,
  frequency: 'mwf',
  runner: 'GitHub Actions',
  maxRunnerMinutes: 180,
  midSizedSitesPerRun: CRAWL_MID_SIZED_SITES_PER_RUN,
  /** 로컬 「지금 수집 실행」 UI용 대략적 예상 시간(분). 실제와 다를 수 있습니다. */
  localManualRunEstimateMinutes: 80,
} as const;

/** 월·수·금만 세어, 그 회차가 중견 명단의 몇 번째 묶음인지 반환합니다. */
export function scheduledCrawlSlotIndex(now = Date.now()): number {
  const kst = new Date(now + 9 * 60 * 60 * 1000);
  let dayIndex = Math.floor(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) / 86_400_000,
  );
  let weekday = (dayIndex + 4) % 7;
  while (weekday !== 1 && weekday !== 3 && weekday !== 5) {
    dayIndex -= 1;
    weekday = (dayIndex + 4) % 7;
  }
  const daysFromFirstMonday = dayIndex - 4;
  const weeks = Math.floor(daysFromFirstMonday / 7);
  const offset = ((daysFromFirstMonday % 7) + 7) % 7;
  const indexInWeek = offset === 0 ? 0 : offset === 2 ? 1 : 2;
  return weeks * 3 + indexInWeek;
}

export function rotatingBatchStart(length: number, batchSize: number, now = Date.now()): number {
  if (length <= 0 || batchSize <= 0 || length <= batchSize) return 0;
  return (scheduledCrawlSlotIndex(now) * batchSize) % length;
}

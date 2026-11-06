import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';

const DEFAULT_GRACE_MINUTES = 3;

let deadlineAt = Number.POSITIVE_INFINITY;
let limitEndsAt = 0;

function readMinutes(envKey: string, fallback: number): number {
  const raw = Number(process.env[envKey]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return raw;
}

/** GitHub 180분 제한 직전에 멈추고, 그 시각을 최근 수집 일시로 남길 수 있게 합니다. */
export function armCrawlRunDeadline(now = Date.now()): void {
  const onRunner = process.env.GITHUB_ACTIONS === 'true' || Boolean(process.env.CRAWL_RUN_DEADLINE_MINUTES);
  if (!onRunner) {
    deadlineAt = Number.POSITIVE_INFINITY;
    limitEndsAt = 0;
    return;
  }
  const minutes = readMinutes('CRAWL_RUN_DEADLINE_MINUTES', CRAWL_SCHEDULE.maxRunnerMinutes);
  const grace = readMinutes('CRAWL_RUN_DEADLINE_GRACE_MINUTES', DEFAULT_GRACE_MINUTES);
  limitEndsAt = now + minutes * 60_000;
  deadlineAt = limitEndsAt - Math.min(grace, minutes - 1) * 60_000;
}

export function isCrawlRunDeadlineReached(now = Date.now()): boolean {
  return now >= deadlineAt;
}

export function crawlRunLimitMessage(): string {
  return `수집 제한 시간 ${CRAWL_SCHEDULE.maxRunnerMinutes}분에 이르러 나머지를 다음 회차로 넘깁니다.`;
}

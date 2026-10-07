const DEFAULT_SOURCE_DELAY_MS = 2_000;
const DEFAULT_REQUEST_GAP_MS = 400;

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getCrawlSourceDelayMs(): number {
  const raw = Number(process.env.CRAWL_SOURCE_DELAY_MS ?? DEFAULT_SOURCE_DELAY_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_SOURCE_DELAY_MS;
}

export function getCrawlRequestGapMs(): number {
  const raw = Number(process.env.CRAWL_REQUEST_GAP_MS ?? DEFAULT_REQUEST_GAP_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_REQUEST_GAP_MS;
}

export async function pauseBetweenCrawlSources(): Promise<void> {
  await delay(getCrawlSourceDelayMs());
}

let lastRequestAt = 0;

/** 동일 프로세스 내 HTTP 요청 간 최소 간격을 둡니다. */
export async function paceCrawlRequest(): Promise<void> {
  const gap = getCrawlRequestGapMs();
  if (gap <= 0) return;

  const now = Date.now();
  const wait = lastRequestAt + gap - now;
  if (wait > 0) await delay(wait);
  lastRequestAt = Date.now();
}

/** 환경 변수(ms). 최소 5초, 최대 30분. */
export function crawlTimeoutMs(envKey: string, defaultMs: number): number {
  const raw = Number(process.env[envKey]);
  if (!Number.isFinite(raw) || raw < 5_000) return defaultMs;
  return Math.min(1_800_000, Math.floor(raw));
}

/** 한 회사(채용 URL 1곳) generic·Greenhouse 수집 상한 */
export function companyCrawlTimeoutMs(): number {
  return crawlTimeoutMs('CRAWL_COMPANY_TIMEOUT_MS', 90_000);
}

/** 대기업 등 단일 소스 adapter 전체 상한 */
export function sourceCrawlTimeoutMs(): number {
  return crawlTimeoutMs('CRAWL_SOURCE_TIMEOUT_MS', 600_000);
}

/** 공고 상세 HTML/JSON 1건 */
export function jobDetailFetchTimeoutMs(): number {
  return crawlTimeoutMs('CRAWL_JOB_DETAIL_TIMEOUT_MS', 45_000);
}

/** Playwright 페이지 1회 */
export function browserPageTimeoutMs(): number {
  return crawlTimeoutMs('CRAWL_BROWSER_PAGE_MS', 45_000);
}

export async function withCrawlTimeout<T>(label: string, ms: number, fn: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label}: ${Math.round(ms / 1000)}초 안에 끝나지 않아 건너뜁니다.`));
    }, ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

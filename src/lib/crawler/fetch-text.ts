import { BROWSER_HTML_HEADERS } from '@/lib/crawler/browser-headers';
import { paceCrawlRequest } from '@/lib/crawler/crawl-throttle';

const DEFAULT_HEADERS = BROWSER_HTML_HEADERS;

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  await paceCrawlRequest();
  const res = await fetch(url, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }

  return res.text();
}

import { BROWSER_HTML_HEADERS } from '@/lib/crawler/browser-headers';

const DEFAULT_HEADERS = BROWSER_HTML_HEADERS;

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
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

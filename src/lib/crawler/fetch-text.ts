const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  'User-Agent': 'JobLink365Bot/1.0 (+https://joblink365.com)',
};

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

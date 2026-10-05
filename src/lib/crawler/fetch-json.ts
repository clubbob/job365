const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'JobLink365Bot/1.0 (+https://joblink365.com)',
};

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
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

  return (await res.json()) as T;
}

export async function postJson<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  return fetchJson<T>(url, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

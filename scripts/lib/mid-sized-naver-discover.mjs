const BLOCKED_HOST =
  /naver\.|jobkorea\.|saramin\.|wanted\.|catch\.co\.kr|jumpit\.|programmers\.|incruit\.|instagram\.|facebook\.|youtube\.|google\.|tistory\.|wikipedia\.|linkedin\.com|pstatic\.net|\.ac\.kr|\.go\.kr|\.or\.kr\/news/i;

const CAREER_URL_HINT = /career|recruit|jobs|채용|인재|greetinghr|greenhouse|lever|ashby|\/hr\b/i;

export function searchLabel(companyName) {
  return companyName
    .replace(/\(주\)|주식회사|㈜/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchNaverLinks(query, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(`https://search.naver.com/search.naver?query=${q}`, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const raw = [...html.matchAll(/https?:\/\/[a-zA-Z0-9.-]+\.[a-z]{2,}[^"'<>\s]*/g)].map((m) =>
      m[0].replace(/&amp;/g, '&'),
    );
    return [...new Set(raw)].filter((url) => !BLOCKED_HOST.test(url));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** @deprecated webSearchCareerCandidates 사용 */
export async function naverSearchCareerCandidates(companyName, timeoutMs = 10_000) {
  const { webSearchCareerCandidates } = await import('./mid-sized-web-discover.mjs');
  return webSearchCareerCandidates(companyName, timeoutMs);
}

export async function expandHomepageCareerPaths(origin, probeUrl, timeoutMs) {
  const paths = [
    '/recruit',
    '/recruitment',
    '/careers',
    '/career',
    '/jobs',
    '/ko/careers',
    '/kor/careers',
    '/company/recruit',
    '/company/careers',
    '/hr/recruit',
    '/about/recruit',
    '/kor/recruit',
    '/recruit/list',
  ];
  for (const path of paths) {
    const hit = await probeUrl(`${origin}${path}`, Math.min(timeoutMs, 7000));
    if (hit) return hit;
  }
  return null;
}

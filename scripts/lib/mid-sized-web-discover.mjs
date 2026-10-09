/**
 * 마당과 무관하게 회사명·사업자번호로 채용 URL 후보를 웹에서 수집합니다.
 */
import { searchLabel } from './mid-sized-naver-discover.mjs';

const BLOCKED_HOST =
  /naver\.|daum\.|instagram\.|facebook\.|youtube\.|google\.|tistory\.|wikipedia\.|pstatic\.net|duckduckgo\.|bing\.|\.ac\.kr|news\./i;

const CAREER_URL_HINT = /career|recruit|jobs|채용|인재|greetinghr|greenhouse|lever|ashby|\/hr\b|team\./i;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

function extractUrlsFromHtml(html) {
  const raw = [...html.matchAll(/https?:\/\/[a-zA-Z0-9.-]+\.[a-z]{2,}[^"'<>\s]*/g)].map((m) =>
    m[0].replace(/&amp;/g, '&'),
  );
  return [...new Set(raw)].filter((url) => !BLOCKED_HOST.test(url));
}

function rankCandidates(urls) {
  const unique = [...new Set(urls)];
  const careerFirst = unique.filter((url) => CAREER_URL_HINT.test(url));
  const rest = unique.filter((url) => !CAREER_URL_HINT.test(url));
  return [...careerFirst, ...rest];
}

async function fetchNaverLinks(query, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(`https://search.naver.com/search.naver?query=${q}`, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) return [];
    return extractUrlsFromHtml(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDaumLinks(query, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(`https://search.daum.net/search?w=tot&q=${q}`, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) return [];
    return extractUrlsFromHtml(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDuckDuckGoLinks(query, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `q=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const html = await res.text();
    const uddg = [...html.matchAll(/uddg=([^&"']+)/g)].map((m) => decodeURIComponent(m[1]));
    const direct = extractUrlsFromHtml(html);
    return [...new Set([...uddg, ...direct])].filter((url) => !BLOCKED_HOST.test(url));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** 네이버·다음·DuckDuckGo로 채용·홈페이지 후보 URL을 모읍니다. */
export async function webSearchCareerCandidates(companyName, timeoutMs = 10_000, businessNumber = '') {
  const label = searchLabel(companyName);
  if (!label || label.length < 2) return [];

  const digits = String(businessNumber ?? '').replace(/\D/g, '');
  const queries = [
    `${label} 채용`,
    `${label} 인재채용`,
    `${label} 채용공고`,
    `${label} careers`,
    `${label} recruit`,
    `${label} 홈페이지`,
    `${label} recruit site`,
  ];
  if (digits.length === 10) {
    queries.push(`${label} ${digits.slice(0, 3)}-${digits.slice(3, 5)} 채용`);
  }

  const merged = [];
  for (const query of queries) {
    const [naver, daum, ddg] = await Promise.all([
      fetchNaverLinks(query, timeoutMs),
      fetchDaumLinks(query, Math.min(timeoutMs, 8000)),
      fetchDuckDuckGoLinks(query, Math.min(timeoutMs, 8000)),
    ]);
    merged.push(...naver, ...daum, ...ddg);
    if (merged.length >= 24) break;
  }

  return rankCandidates(merged).slice(0, 20);
}

export { fetchNaverLinks };

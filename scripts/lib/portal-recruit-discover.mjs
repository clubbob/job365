/**
 * 잡코리아·사람인 등 포털의 회사별 채용 페이지를 네이버 검색으로 찾습니다 (URL 연결 최대화).
 */
import { isPortalCareersUrl, isStorableCareersUrl } from './careers-url-policy.mjs';
import { searchLabel } from './mid-sized-naver-discover.mjs';
import { fetchNaverLinks } from './mid-sized-web-discover.mjs';

const PORTAL_RECRUIT_PATH =
  /recruit|career|채용|company-info|co_read|gi_read|view-inner-recruit|employ|job-search/i;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

export function isPortalRecruitListingUrl(url) {
  if (!isStorableCareersUrl(url) || !isPortalCareersUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const blob = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return PORTAL_RECRUIT_PATH.test(blob);
  } catch {
    return false;
  }
}

function uniquePortalUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    const url = raw.split('#')[0];
    if (!isPortalRecruitListingUrl(url) || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** 포털 채용 목록·기업 채용 페이지 후보 URL */
export async function searchPortalRecruitCandidates(companyName, businessNumber, timeoutMs = 10_000) {
  const label = searchLabel(companyName);
  if (!label || label.length < 2) return [];

  const digits = String(businessNumber ?? '').replace(/\D/g, '');
  const queries = [
    `${label} site:jobkorea.co.kr 채용`,
    `${label} site:saramin.co.kr 채용`,
    `${label} 잡코리아 채용공고`,
    `${label} 사람인 채용`,
    `${label} site:wanted.co.kr jobs`,
    `${label} site:catch.co.kr 채용`,
    `${label} site:jumpit.co.kr`,
  ];
  if (digits.length === 10) {
    queries.push(`${digits} 채용`);
    queries.push(`${label} ${digits.slice(0, 3)}-${digits.slice(3, 5)} 채용`);
  }

  const merged = [];
  for (const query of queries) {
    merged.push(...(await fetchNaverLinks(query, timeoutMs)));
    if (merged.length >= 20) break;
  }

  return uniquePortalUrls(merged).slice(0, 12);
}

/** 페이지에 회사명이 실제로 나오는지 가볍게 확인합니다. */
export async function verifyCompanyOnRecruitPage(url, companyName, timeoutMs = 9000) {
  const label = searchLabel(companyName);
  const compact = label.replace(/\s+/g, '');
  const core = compact.replace(/[^\w가-힣]/g, '');
  if (core.length < 3) return true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) return false;
    const text = (await res.text()).slice(0, 100_000);
    if (text.includes(label) || text.includes(compact)) return true;
    const short = core.slice(0, Math.min(8, core.length));
    return short.length >= 4 && text.includes(short);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

import { createHash } from 'node:crypto';
import { isStorableCareersUrl } from './careers-url-policy.mjs';
import { expandHomepageCareerPaths } from './mid-sized-naver-discover.mjs';
import {
  searchPortalRecruitCandidates,
  verifyCompanyOnRecruitPage,
} from './portal-recruit-discover.mjs';
import { webSearchCareerCandidates } from './mid-sized-web-discover.mjs';

const CAREER_PATH_HINTS = /채용|career|recruit|지원|공고|채용공고|jobs|인재/i;
const HTML_MIN_LENGTH = 200;

export function normalizeCompanyName(name) {
  return name
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .replace(/[^\w가-힣]/g, '')
    .trim();
}

export function slugAscii(name) {
  const cleaned = normalizeCompanyName(name).toLowerCase();
  if (!cleaned) return '';
  return cleaned.replace(/[^a-z0-9]/g, '');
}

export function crawlSourceId(businessNumber, companyName) {
  const digits = String(businessNumber ?? '').replace(/\D/g, '');
  if (digits) return `mid-${digits}`;
  const hash = createHash('sha1').update(companyName).digest('hex').slice(0, 12);
  return `mid-${hash}`;
}

export function candidateUrls(companyName) {
  const slug = slugAscii(companyName);
  const compact = normalizeCompanyName(companyName);
  const urls = [];
  if (slug) {
    urls.push(
      `https://${slug}.career.greetinghr.com`,
      `https://${slug}.greetinghr.com`,
      `https://${slug}.recruit.co.kr`,
      `https://recruit.${slug}.co.kr`,
      `https://career.${slug}.co.kr`,
      `https://careers.${slug}.com`,
      `https://career.${slug}.com`,
      `https://www.${slug}.com/careers`,
      `https://www.${slug}.com/recruit`,
      `https://www.${slug}.co.kr/recruit`,
      `https://www.${slug}.co.kr/careers`,
      `https://${slug}.com/careers`,
      `https://${slug}.co.kr/recruit`,
      `https://team.${slug}.com`,
      `https://boards.greenhouse.io/${slug}`,
      `https://jobs.lever.co/${slug}`,
      `https://jobs.ashbyhq.com/${slug}`,
    );
  }
  if (compact && compact !== slug) {
    urls.push(`https://${compact}.career.greetinghr.com`);
  }
  return [...new Set(urls)];
}

async function tryGreenhouseBoard(slug, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 JobLink365-Crawler/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.jobs) && data.jobs.length >= 0) {
      return `https://boards.greenhouse.io/${slug}`;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function tryLeverBoard(slug, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 JobLink365-Crawler/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return `https://jobs.lever.co/${slug}`;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isBlockedCareerHost(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('.ac.kr') || host.endsWith('.go.kr')) return true;
    if (/^news\./i.test(host)) return true;
    return false;
  } catch {
    return true;
  }
}

export async function probeUrl(url, timeoutMs) {
  if (isBlockedCareerHost(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 JobLink365-Crawler/1.0' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length < HTML_MIN_LENGTH) return null;
    if (isStorableCareersUrl(url) && CAREER_PATH_HINTS.test(text)) return url;
    if (isStorableCareersUrl(url) && /recruit|career|채용|jobs|\/Comp\/Recruit|greetinghr/i.test(url)) return url;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 회사명에서 slug를 뽑아 ATS·채용 URL 후보를 순서대로 검사합니다. */
export async function discoverCareersUrl(company, timeoutMs = 8000) {
  const slug = slugAscii(company.companyName);
  if (slug) {
    const gh = await tryGreenhouseBoard(slug, Math.min(timeoutMs, 5000));
    if (gh) return gh;
    const lever = await tryLeverBoard(slug, Math.min(timeoutMs, 5000));
    if (lever) return lever;
  }

  for (const url of candidateUrls(company.companyName)) {
    if (url.includes('greenhouse.io') || url.includes('lever.co') || url.includes('ashbyhq.com')) {
      continue;
    }
    const hit = await probeUrl(url, timeoutMs);
    if (hit) return hit;
  }

  if (slug) {
    const ghPage = await probeUrl(`https://boards.greenhouse.io/${slug}`, timeoutMs);
    if (ghPage) return ghPage;
    const leverPage = await probeUrl(`https://jobs.lever.co/${slug}`, timeoutMs);
    if (leverPage) return leverPage;
  }

  const webCandidates = await webSearchCareerCandidates(
    company.companyName,
    Math.max(timeoutMs, 12_000),
    company.businessNumber,
  );
  for (const url of webCandidates) {
    const hit = await probeUrl(url, timeoutMs);
    if (hit) return hit;
  }

  for (const url of webCandidates.slice(0, 8)) {
    try {
      const origin = new URL(url).origin;
      const fromHome = await expandHomepageCareerPaths(origin, probeUrl, timeoutMs);
      if (fromHome) return fromHome;
    } catch {
      // ignore
    }
  }

  const first = webCandidates[0];
  if (first) {
    try {
      const origin = new URL(first).origin;
      const fromHome = await expandHomepageCareerPaths(origin, probeUrl, timeoutMs);
      if (fromHome) return fromHome;
    } catch {
      // ignore invalid URL
    }
  }

  const portalCandidates = await searchPortalRecruitCandidates(
    company.companyName,
    company.businessNumber,
    Math.max(timeoutMs, 12_000),
  );
  for (const url of portalCandidates) {
    if (await verifyCompanyOnRecruitPage(url, company.companyName, Math.min(timeoutMs, 10_000))) {
      return url;
    }
  }

  return null;
}

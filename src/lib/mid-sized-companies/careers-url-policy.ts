/** 절대 저장하지 않는 URL(스크립트·SNS·명백한 오탐·뉴스) */
const HARD_BLOCK_RE =
  /pstatic\.net|instagram\.|facebook\.|youtube\.|wikipedia\.|w3\.org|schema\.org|example\.com|linkedin\.com\/(?!.*jobs)|doubleclick\.|googletagmanager|melon\.com|higoodday\.com|skcareersjournal\.com|linkareer\.com|inthiswork\.com/i;

/** 회사 채용 페이지가 아닌 커뮤니티 구인·홍보·저널·대외활동 게시판 */
const CLASSIFIEDS_HOST_RE =
  /(?:^|\.)(?:higoodday|skcareersjournal|linkareer|inthiswork)\.com$/i;

/** 공식 채용 사이트만(포털 제외) — 통계·품질 표시용 */
const PORTAL_HOST_RE =
  /catch\.co\.kr|jobkorea\.|saramin\.|wanted\.co\.kr|jumpit\.|programmers\.co\.kr|incruit\.|albamon\.|work24\.go\.kr|zighang\.com/i;

export function isClassifiedsBoardUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  return CLASSIFIEDS_HOST_RE.test(parsed.hostname);
}

function parseHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed;
  } catch {
    return null;
  }
}

function baseChecks(url: string): boolean {
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'cs.com' || host.endsWith('.cs.com')) return false;
  const hostPath = `${parsed.hostname}${parsed.pathname}`;
  if (HARD_BLOCK_RE.test(hostPath)) return false;
  if (/\.(js|css|png|jpe?g|gif|svg|woff2?|ico|xml)$/i.test(parsed.pathname)) return false;
  return true;
}

/** 공식 채용 페이지 URL(포털·잘못된 링크 제외) */
export function isAcceptableCareersUrl(url: string | null | undefined): boolean {
  if (!url?.trim() || !baseChecks(url)) return false;
  const parsed = parseHttpUrl(url)!;
  const hostPath = `${parsed.hostname}${parsed.pathname}`;
  if (PORTAL_HOST_RE.test(hostPath)) return false;
  if (/ipsos\.com\/careers/i.test(hostPath)) return false;
  return true;
}

/**
 * DB·수집에 쌓을 수 있는 URL.
 * 전문 구인·구직 포털(잡코리아·사람인 등)은 제외하고, 기업 자사 채용 페이지만 허용합니다.
 */
export function isStorableCareersUrl(url: string | null | undefined): boolean {
  if (!url?.trim() || !baseChecks(url)) return false;
  const parsed = parseHttpUrl(url)!;
  const hostPath = `${parsed.hostname}${parsed.pathname}`;
  if (PORTAL_HOST_RE.test(hostPath)) return false;
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (host === 'www.se.com' && path.includes('/careers')) return false;
  if (host === 'www.sns.com' && path.includes('/careers')) return false;
  if (host === '21.com' || host === 'www.21.com') return false;
  if (host === 'stx.com' && path.includes('/careers')) return false;
  if (host === 'ent.com' && path.includes('/careers')) return false;
  return true;
}

export function isPortalCareersUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  return PORTAL_HOST_RE.test(`${parsed.hostname}${parsed.pathname}`);
}

/** 수집·노출에서 제외하는 전문 구인·구직 포털 유래 공고 */
export function isPortalSourcedCrawledJob(job: {
  id?: string;
  sourceId?: string;
  applyUrl?: string | null;
}): boolean {
  const id = job.id?.trim() ?? '';
  const sourceId = job.sourceId?.trim() ?? '';
  if (id.startsWith('work24-')) return true;
  if (sourceId.includes('work24')) return true;
  const applyUrl = job.applyUrl?.trim() ?? '';
  if (applyUrl && isPortalCareersUrl(applyUrl)) return true;
  return false;
}

/** 채용 상세·지원 링크가 아닌 뉴스·기사 URL */
export function isNewsArticleJobUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (host === 'cs.com' || host.endsWith('.cs.com')) return true;
  if (/\/entertainment\/story\//i.test(path)) return true;
  if (/\/(?:news|article|story)\//i.test(path) && !/(?:recruit|career|job|채용|모집)/i.test(path)) {
    return true;
  }
  return false;
}

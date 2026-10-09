/** 절대 저장하지 않는 URL(스크립트·SNS·명백한 오탐) */
const HARD_BLOCK_RE =
  /pstatic\.net|instagram\.|facebook\.|youtube\.|wikipedia\.|w3\.org|schema\.org|example\.com|linkedin\.com\/(?!.*jobs)|doubleclick\.|googletagmanager/i;

/** 공식 채용 사이트만(포털 제외) — 통계·품질 표시용 */
const PORTAL_HOST_RE =
  /catch\.co\.kr|jobkorea\.|saramin\.|wanted\.co\.kr|jumpit\.|programmers\.co\.kr|incruit\.|albamon\.|work24\.go\.kr/i;

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
 * DB·수집에 쌓을 수 있는 URL(최대 확보 모드).
 * catch·잡코리아 등 회사별 포털 페이지도 포함합니다.
 */
export function isStorableCareersUrl(url: string | null | undefined): boolean {
  if (!url?.trim() || !baseChecks(url)) return false;
  const parsed = parseHttpUrl(url)!;
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  // slug 오탐으로 잡히는 해외 대기업 careers 경로
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

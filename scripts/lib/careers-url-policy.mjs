/** @see src/lib/mid-sized-companies/careers-url-policy.ts */
const HARD_BLOCK_RE =
  /pstatic\.net|instagram\.|facebook\.|youtube\.|wikipedia\.|w3\.org|schema\.org|example\.com|linkedin\.com\/(?!.*jobs)|doubleclick\.|googletagmanager/i;

const PORTAL_HOST_RE =
  /catch\.co\.kr|jobkorea\.|saramin\.|wanted\.co\.kr|jumpit\.|programmers\.co\.kr|incruit\.|albamon\.|work24\.go\.kr/i;

function parseHttpUrl(url) {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed;
  } catch {
    return null;
  }
}

function baseChecks(url) {
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  const hostPath = `${parsed.hostname}${parsed.pathname}`;
  if (HARD_BLOCK_RE.test(hostPath)) return false;
  if (/\.(js|css|png|jpe?g|gif|svg|woff2?|ico|xml)$/i.test(parsed.pathname)) return false;
  return true;
}

export function isAcceptableCareersUrl(url) {
  if (!url?.trim() || !baseChecks(url)) return false;
  const parsed = parseHttpUrl(url);
  const hostPath = `${parsed.hostname}${parsed.pathname}`;
  if (PORTAL_HOST_RE.test(hostPath)) return false;
  if (/ipsos\.com\/careers/i.test(hostPath)) return false;
  return true;
}

export function isStorableCareersUrl(url) {
  if (!url?.trim() || !baseChecks(url)) return false;
  const parsed = parseHttpUrl(url);
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (host === 'www.se.com' && path.includes('/careers')) return false;
  if (host === 'www.sns.com' && path.includes('/careers')) return false;
  if (host === '21.com' || host === 'www.21.com') return false;
  if (host === 'stx.com' && path.includes('/careers')) return false;
  if (host === 'ent.com' && path.includes('/careers')) return false;
  return true;
}

export function isPortalCareersUrl(url) {
  if (!url?.trim()) return false;
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  return PORTAL_HOST_RE.test(`${parsed.hostname}${parsed.pathname}`);
}

export const SITE_DOMAIN = 'joblink365.com';
export const SITE_URL = `https://${SITE_DOMAIN}`;

export function getPublicSiteUrl(fallbackOrigin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  if (process.env.VERCEL_ENV === 'production') return SITE_URL;
  if (fallbackOrigin) return fallbackOrigin.replace(/\/+$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}

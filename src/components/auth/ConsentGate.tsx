'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/auth-context';

const CONSENT_EXEMPT_PATHS = new Set([
  '/login',
  '/signup',
  '/signup/consent',
  '/forgot-password',
  '/reset-password/confirm',
  '/terms',
  '/privacy',
  '/marketing',
]);

function isConsentExemptPath(pathname: string): boolean {
  return (
    CONSENT_EXEMPT_PATHS.has(pathname) ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/admin')
  );
}

export default function ConsentGate({ children }: { children: React.ReactNode }) {
  const { user, loading, needsConsent } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || !needsConsent) return;
    if (isConsentExemptPath(pathname)) return;

    const next = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
    router.replace(`/signup/consent${next}`);
  }, [user, loading, needsConsent, pathname, router]);

  if (user && needsConsent && !isConsentExemptPath(pathname)) {
    return <p className="py-10 text-center text-sm text-muted">약관 동의 확인 중…</p>;
  }

  return children;
}

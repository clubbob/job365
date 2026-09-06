'use client';

import { usePathname } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';
import { cn } from '@/lib/utils';

const HIDE_CONTENT_AD = new Set([
  '/signup',
  '/signup/consent',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/marketing',
]);

export default function LayoutMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const showContentAd =
    !isAdmin && !pathname.startsWith('/reset-password') && !HIDE_CONTENT_AD.has(pathname);

  return (
    <main
      className={cn(
        'mx-auto w-full px-4 pb-6 pt-5 sm:px-6',
        isAdmin ? 'max-w-7xl' : 'max-w-4xl',
      )}
    >
      {children}
      {showContentAd ? (
        <div className="mt-6 print:hidden">
          <AdSlot placement="footer" />
        </div>
      ) : null}
    </main>
  );
}

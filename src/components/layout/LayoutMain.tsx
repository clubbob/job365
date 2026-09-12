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

function isPostingDetailPath(pathname: string): boolean {
  const job = pathname.match(/^\/jobs\/([^/]+)$/);
  if (job && job[1] !== 'new') return true;
  const talent = pathname.match(/^\/talents\/([^/]+)$/);
  if (talent && talent[1] !== 'new') return true;
  return false;
}

export default function LayoutMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const showContentAd =
    !isAdmin &&
    !pathname.startsWith('/reset-password') &&
    !HIDE_CONTENT_AD.has(pathname) &&
    !isPostingDetailPath(pathname);

  return (
    <main
      className={cn(
        'mx-auto w-full min-w-0 flex-1 px-4 pb-6 pt-5 sm:px-6',
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

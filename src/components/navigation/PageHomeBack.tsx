'use client';

import { usePathname } from 'next/navigation';
import PageActions from '@/components/navigation/PageActions';

/** PageHeader를 쓰는 화면은 버튼을 중복하지 않습니다. */
const TITLE_HEADER_PATHS = new Set([
  '/mypage',
  '/jobs',
  '/jobs/new',
  '/inquiry',
  '/login',
  '/signup',
  '/signup/consent',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/marketing',
]);

export default function PageHomeBack() {
  const pathname = usePathname();
  if (
    pathname === '/' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/jobs/') ||
    TITLE_HEADER_PATHS.has(pathname)
  ) {
    return null;
  }

  return (
    <div className="mb-5 flex justify-end">
      <PageActions showRefresh={pathname !== '/login'} />
    </div>
  );
}

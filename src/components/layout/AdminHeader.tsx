'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/brand/Logo';
import { openInDesktopBrowserWindow } from '@/components/navigation/HomeBackLink';
import AdminInstantLink from '@/features/admin/AdminInstantLink';
import { useAdminAuth } from '@/features/admin/admin-auth-context';
import { ADMIN_HEADER_NAV } from '@/lib/admin-menu';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  if (href === '/admin/jobs/crawled') {
    return pathname === '/admin/jobs' || pathname.startsWith('/admin/jobs/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminHeader() {
  const pathname = usePathname();
  const { loading, loggedIn, logout } = useAdminAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showAdminNav = mounted && loggedIn;
  const authReady = mounted && !loading;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface shadow-sm print:hidden">
      <div className="mx-auto flex min-h-14 max-w-7xl min-w-0 flex-wrap items-center gap-2 px-4 py-2 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
        <AdminInstantLink href="/admin" className="inline-flex min-w-0 items-center">
          <Logo />
        </AdminInstantLink>

        {showAdminNav ? (
          <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="관리자 메뉴">
            {ADMIN_HEADER_NAV.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <AdminInstantLink
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:bg-neutral-100 hover:text-foreground',
                  )}
                >
                  {item.label}
                </AdminInstantLink>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-neutral-100 hover:text-foreground"
            onClick={(event) => {
              event.preventDefault();
              openInDesktopBrowserWindow('/');
            }}
          >
            사이트
          </Link>
          {!authReady ? (
            <span className="text-sm text-muted">확인 중…</span>
          ) : loggedIn ? (
            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-neutral-100 hover:text-foreground"
            >
              로그아웃
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

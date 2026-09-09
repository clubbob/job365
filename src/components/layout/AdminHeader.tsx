'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/brand/Logo';
import { useAdminAuth } from '@/features/admin/admin-auth-context';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: '관리 홈', exact: true },
  { href: '/admin/users', label: '회원', exact: false },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminHeader() {
  const pathname = usePathname();
  const { loading, loggedIn, logout } = useAdminAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface shadow-sm print:hidden">
      <div className="mx-auto flex min-h-14 max-w-7xl min-w-0 flex-wrap items-center gap-2 px-4 py-2 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
        <Link href="/admin" className="inline-flex min-w-0 items-center gap-2">
          <Logo />
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-muted">
            관리자
          </span>
        </Link>

        {loggedIn ? (
          <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="관리자 메뉴">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
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
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
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

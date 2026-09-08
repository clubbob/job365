'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import HeaderModeMenu from '@/components/layout/HeaderModeMenu';
import Logo from '@/components/brand/Logo';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { getModeRegisterAction } from '@/lib/user-mode';
import { getUserNicknameFallback } from '@/lib/user-display';
import { cn } from '@/lib/utils';

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5" aria-hidden>
      <span
        className={cn(
          'absolute left-0 block h-0.5 w-5 rounded-full bg-foreground transition-all',
          open ? 'top-[7px] rotate-45' : 'top-0',
        )}
      />
      <span
        className={cn(
          'absolute left-0 top-[7px] block h-0.5 w-5 rounded-full bg-foreground transition-all',
          open ? 'opacity-0' : 'opacity-100',
        )}
      />
      <span
        className={cn(
          'absolute left-0 block h-0.5 w-5 rounded-full bg-foreground transition-all',
          open ? 'top-[7px] -rotate-45' : 'top-[14px]',
        )}
      />
    </span>
  );
}

function isNavActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  if (href === '/jobs' && pathname.startsWith('/jobs/new')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function HeaderClient() {
  const { user, loading, logout } = useAuth();
  const { mode } = useUserMode();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const registerAction = user ? getModeRegisterAction(mode) : null;
  const navItems = [
    { href: '/jobs', label: '채용 정보', exact: false },
    { href: '/talents', label: '인재 정보', exact: false },
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navLinkClassName =
    'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors';

  const mobileLinkClassName =
    'block rounded-lg px-3 py-3 text-base font-semibold transition-colors';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface shadow-sm print:hidden">
      <div className="mx-auto grid h-14 max-w-4xl grid-cols-[1fr_auto] items-center gap-3 px-4 md:grid-cols-[auto_1fr_auto] sm:px-6">
        <Link href="/" className="inline-flex min-w-0 items-center transition-opacity hover:opacity-85">
          <Logo />
        </Link>

        {navItems.length > 0 ? (
          <nav className="hidden items-center justify-center gap-1 md:flex" aria-label="주요 메뉴">
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    navLinkClassName,
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
          <div className="hidden md:block" />
        )}

        <div className="hidden items-center justify-end gap-2 md:flex">
          {!loading && user ? (
            <>
              {registerAction ? (
                <Link
                  href={registerAction.href}
                  className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
                >
                  {registerAction.label}
                </Link>
              ) : null}
              <span className="inline-flex max-w-[9.5rem] truncate px-1 text-sm font-semibold text-foreground">
                {getUserNicknameFallback(user)}
              </span>
              <HeaderModeMenu align="right" showLogout />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              로그인
            </Link>
          )}
        </div>

        <button
          type="button"
          className="justify-self-end inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border-strong bg-surface md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-border bg-surface md:hidden"
          aria-label="모바일 메뉴"
        >
          <div className="mx-auto max-w-4xl space-y-3 px-4 py-3 sm:px-6">
            {!loading && user ? (
              <div className="border-b border-border pb-3">
                <HeaderModeMenu />
              </div>
            ) : null}

            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    mobileLinkClassName,
                    active
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-neutral-100',
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="border-t border-border pt-3">
              {!loading && user ? (
                <div className="space-y-1">
                  {registerAction ? (
                    <Link
                      href={registerAction.href}
                      className="mb-2 block rounded-lg bg-primary px-3 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
                      onClick={() => setMenuOpen(false)}
                    >
                      {registerAction.label}
                    </Link>
                  ) : null}
                  <Link
                    href="/mypage"
                    className={cn(
                      mobileLinkClassName,
                      pathname === '/mypage'
                        ? 'bg-primary text-white'
                        : 'text-foreground hover:bg-neutral-100',
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    마이페이지
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full rounded-lg border border-border px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-neutral-100"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="block rounded-lg bg-primary px-3 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
                  onClick={() => setMenuOpen(false)}
                >
                  로그인
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

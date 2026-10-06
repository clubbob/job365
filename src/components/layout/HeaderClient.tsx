'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminHeader from '@/components/layout/AdminHeader';
import Logo from '@/components/brand/Logo';
import { useAuth } from '@/features/auth/auth-context';
import { getUserNicknameFallback } from '@/lib/user-display';
import { requestJobBoardReset } from '@/lib/job-board/reset';
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

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  exact: boolean;
  authOnly?: boolean;
  prefetch?: boolean;
}> = [
  { href: '/jobs', label: '채용 공고', exact: false },
  { href: '/jobs/companies', label: '채용 공고 회사', exact: false, prefetch: false },
  { href: '/my-jobs', label: '내 채용 공고', exact: false, authOnly: true },
];

function isNavActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  if (href === '/jobs') {
    return (
      pathname === '/jobs' ||
      (pathname.startsWith('/jobs/') && !pathname.startsWith('/jobs/companies'))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function HeaderClient() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const accountReady = mounted && !loading;
  const nickname = user ? getUserNicknameFallback(user) : '';
  const navLinkClassName = 'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors';
  const mobileLinkClassName = 'block rounded-lg px-3 py-3 text-base font-semibold transition-colors';

  function handleNavClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href === '/jobs' && pathname === '/jobs') {
      event.preventDefault();
      requestJobBoardReset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } finally {
      setLoggingOut(false);
    }
  }

  if (pathname.startsWith('/admin')) {
    return <AdminHeader />;
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.authOnly || user);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface shadow-sm print:hidden">
      <div className="mx-auto grid h-14 max-w-4xl grid-cols-[1fr_auto] items-center gap-3 px-4 md:grid-cols-[auto_1fr_auto] sm:px-6">
        <Link href="/" className="inline-flex min-w-0 items-center transition-opacity hover:opacity-85">
          <Logo />
        </Link>

        <nav className="hidden items-center justify-center gap-1 md:flex" aria-label="주요 메뉴">
          {visibleNavItems.map((item) => {
            const active = isNavActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.prefetch ?? true}
                onClick={(event) => handleNavClick(event, item.href)}
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

        <div className="hidden items-center justify-end gap-2 md:flex">
          {!accountReady ? (
            <div className="h-9 w-44 rounded-lg bg-neutral-100" aria-hidden="true" />
          ) : user ? (
            <>
              <span className="max-w-[8rem] truncate px-1 text-sm font-semibold text-foreground" title={nickname}>
                {nickname}
              </span>
              <Link
                href="/mypage"
                className={cn(
                  navLinkClassName,
                  pathname.startsWith('/mypage')
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:bg-neutral-100 hover:text-foreground',
                )}
              >
                마이페이지
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-neutral-100 hover:text-foreground disabled:opacity-60"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-neutral-100 hover:text-foreground"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
              >
                회원가입
              </Link>
            </>
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
            {visibleNavItems.map((item) => {
              const active = isNavActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={item.prefetch ?? true}
                  className={cn(
                    mobileLinkClassName,
                    active ? 'bg-primary text-white' : 'text-foreground hover:bg-neutral-100',
                  )}
                  onClick={(event) => {
                    handleNavClick(event, item.href);
                    setMenuOpen(false);
                  }}
                >
                  {item.label}
                </Link>
              );
            })}

            {!accountReady ? null : user ? (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="px-3 text-sm font-semibold text-foreground">{nickname}</p>
                <Link
                  href="/mypage"
                  className={cn(
                    mobileLinkClassName,
                    pathname.startsWith('/mypage')
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-neutral-100',
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  마이페이지
                </Link>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => void handleLogout()}
                  className={cn(mobileLinkClassName, 'w-full text-left text-foreground hover:bg-neutral-100')}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="space-y-2 border-t border-border pt-3">
                <Link
                  href="/login"
                  className={cn(mobileLinkClassName, 'text-foreground hover:bg-neutral-100')}
                  onClick={() => setMenuOpen(false)}
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="block rounded-lg bg-primary px-3 py-3 text-center text-base font-semibold text-white shadow-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

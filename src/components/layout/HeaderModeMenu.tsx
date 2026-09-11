'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { USER_MODE_LABELS, USER_MODE_SHORT_LABELS, type UserMode } from '@/lib/user-mode';
import { cn } from '@/lib/utils';

const MODES: UserMode[] = ['recruiter', 'jobseeker'];

const itemClassName = 'block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50';

export default function HeaderModeMenu({
  className,
  align = 'left',
  showLogout = false,
}: {
  className?: string;
  align?: 'left' | 'center' | 'right';
  showLogout?: boolean;
}) {
  const { logout } = useAuth();
  const { mode, setMode } = useUserMode();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-neutral-200"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={mode ? `마이페이지, 현재 ${USER_MODE_SHORT_LABELS[mode]}` : '마이페이지'}
        onClick={() => setOpen((value) => !value)}
      >
        마이페이지
        <span aria-hidden className="text-subtle">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 mt-1 min-w-[12.5rem] rounded-lg border border-border bg-surface py-1 shadow-card',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            align === 'right' && 'right-0',
            align === 'left' && 'left-0',
          )}
        >
          <p className="px-3 pb-1 pt-2 text-xs font-semibold text-subtle">이용 주체</p>
          {MODES.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitem"
              className={cn(
                itemClassName,
                mode === item ? 'font-semibold text-primary' : 'text-foreground',
              )}
              onClick={() => {
                setOpen(false);
                setMode(item, { navigate: true });
              }}
            >
              {USER_MODE_LABELS[item]}
            </button>
          ))}
          {showLogout ? (
            <>
              {mode ? (
                <Link
                  href="/mypage"
                  role="menuitem"
                  className={cn(itemClassName, 'border-t border-border text-foreground')}
                  onClick={() => setOpen(false)}
                >
                  이용 현황
                </Link>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className={cn(itemClassName, mode ? 'text-muted' : 'border-t border-border text-muted')}
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
              >
                로그아웃
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

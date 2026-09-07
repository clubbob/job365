'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { USER_MODE_LABELS, type UserMode } from '@/lib/user-mode';
import { cn } from '@/lib/utils';

const MODES: UserMode[] = ['recruiter', 'jobseeker'];

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
  const { mode, setMode, resetMode } = useUserMode();
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

  const label = mode ? USER_MODE_LABELS[mode] : '설정';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-2 text-sm font-medium transition-colors hover:bg-neutral-200 hover:text-foreground',
          mode ? 'text-foreground' : 'text-muted',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={mode ? `설정, 현재 ${label}` : '설정'}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
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
          {MODES.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitem"
              className={cn(
                'block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50',
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
          <button
            type="button"
            role="menuitem"
            className={cn(
              'block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50',
              !mode ? 'font-semibold text-primary' : 'text-foreground',
            )}
            onClick={() => {
              setOpen(false);
              resetMode({ navigate: true });
            }}
          >
            선택해제
          </button>
          {showLogout ? (
            <>
              <Link
                href="/mypage"
                role="menuitem"
                className="block border-t border-border px-3 py-2 text-left text-sm text-foreground hover:bg-neutral-50"
                onClick={() => setOpen(false)}
              >
                마이페이지
              </Link>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-muted hover:bg-neutral-50"
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

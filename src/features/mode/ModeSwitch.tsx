'use client';

import { USER_MODE_LABELS, type UserMode } from '@/lib/user-mode';
import { useUserMode } from '@/features/mode/mode-context';
import { cn } from '@/lib/utils';

const MODES: UserMode[] = ['jobseeker', 'recruiter'];

export default function ModeSwitch({
  className,
  navigate = false,
}: {
  className?: string;
  navigate?: boolean;
}) {
  const { mode, setMode } = useUserMode();

  return (
    <div
      className={cn('inline-flex rounded-lg border border-border bg-neutral-50 p-0.5', className)}
      role="group"
      aria-label="이용 선택"
    >
      {MODES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setMode(item, { navigate })}
          className={cn(
            'rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3',
            mode === item
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
        >
          {USER_MODE_LABELS[item]}
        </button>
      ))}
    </div>
  );
}

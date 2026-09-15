'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WORK_TYPE_FILTERS, type JobWorkType } from '@/types/job';

export default function CategoryNav({ current }: { current?: JobWorkType | 'all' }) {
  const selected = current ?? 'all';

  return (
    <div className="grid grid-cols-5 gap-1.5 pb-1 sm:flex sm:flex-wrap sm:gap-2">
      {WORK_TYPE_FILTERS.map((item) => {
        const href = item.id === 'all' ? '/jobs' : `/categories/${item.id}`;
        const active = selected === item.id;

        return (
          <Link
            key={item.id}
            href={href}
            className={cn(
              'inline-flex w-full items-center justify-center rounded-full border px-1.5 py-1.5 text-center text-xs font-medium transition-colors sm:w-auto sm:shrink-0 sm:px-3 sm:text-sm',
              active
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

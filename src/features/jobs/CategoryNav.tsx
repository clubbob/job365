'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WORK_TYPE_FILTERS, type JobWorkType } from '@/types/job';

export default function CategoryNav({ current }: { current?: JobWorkType | 'all' }) {
  const selected = current ?? 'all';

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {WORK_TYPE_FILTERS.map((item) => {
        const href = item.id === 'all' ? '/jobs' : `/categories/${item.id}`;
        const active = selected === item.id;

        return (
          <Link
            key={item.id}
            href={href}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
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

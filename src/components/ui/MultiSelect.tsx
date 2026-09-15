'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function MultiSelect<T extends string>({
  id,
  label,
  allLabel,
  options,
  selected,
  labelOf,
  onChange,
  className,
}: {
  id: string;
  label: string;
  allLabel: string;
  options: readonly T[];
  selected: T[];
  labelOf?: (value: T) => string;
  onChange: (next: T[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const nameOf = labelOf ?? ((value: T) => value);
  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? nameOf(selected[0])
        : `${nameOf(selected[0])} 외 ${selected.length - 1}`;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  function toggle(value: T) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-1 rounded-lg border border-border-strong bg-surface px-2.5 text-left text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25',
          selected.length === 0 ? 'text-subtle' : 'text-foreground',
        )}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <span aria-hidden className="shrink-0 text-subtle">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute z-50 mt-1 max-h-56 w-full min-w-[10.5rem] overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-card"
        >
          <button
            type="button"
            role="option"
            aria-selected={selected.length === 0}
            onClick={() => onChange([])}
            className={cn(
              'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-neutral-50',
              selected.length === 0 ? 'font-semibold text-primary' : 'text-foreground',
            )}
          >
            {allLabel}
          </button>
          {options.map((item) => {
            const active = selected.includes(item);
            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => toggle(item)}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-neutral-50',
                  active ? 'font-semibold text-primary' : 'text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-3.5 shrink-0 items-center justify-center rounded border',
                    active ? 'border-primary bg-primary text-white' : 'border-border-strong bg-surface',
                  )}
                >
                  {active ? '✓' : null}
                </span>
                {nameOf(item)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

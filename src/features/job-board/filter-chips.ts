import { cn } from '@/lib/utils';

export const filterChipClassName = 'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors';

export function filterChipButtonClass(active: boolean): string {
  return cn(
    filterChipClassName,
    active
      ? 'bg-primary text-white shadow-sm'
      : 'bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-foreground',
  );
}

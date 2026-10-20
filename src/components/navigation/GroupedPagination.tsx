'use client';

import { getPageGroupRange, PAGES_PER_GROUP } from '@/lib/pagination-group';
import { cn } from '@/lib/utils';

const PAGE_BUTTON =
  'inline-flex min-w-9 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors';

export default function GroupedPagination({
  page,
  totalPages,
  loading = false,
  onPageChange,
  ariaLabel,
}: {
  page: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  ariaLabel: string;
}) {
  if (totalPages <= 1) return null;

  const { groupStart, groupEnd } = getPageGroupRange(page, totalPages);
  const groupPages = Array.from({ length: groupEnd - groupStart + 1 }, (_, index) => groupStart + index);
  const hasPrevGroup = groupStart > 1;
  const hasNextGroup = groupEnd < totalPages;

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1" aria-label={ariaLabel}>
      <button
        type="button"
        disabled={loading || page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className={cn(
          PAGE_BUTTON,
          'text-muted hover:bg-neutral-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        이전
      </button>
      <button
        type="button"
        disabled={loading || !hasPrevGroup}
        onClick={() => onPageChange(groupStart - PAGES_PER_GROUP)}
        className={cn(
          PAGE_BUTTON,
          'text-muted hover:bg-neutral-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
        )}
        aria-label={`${groupStart - PAGES_PER_GROUP}~${groupStart - 1}페이지 보기`}
      >
        «
      </button>
      {groupPages.map((number) => (
        <button
          key={number}
          type="button"
          disabled={loading}
          aria-current={page === number ? 'page' : undefined}
          onClick={() => onPageChange(number)}
          className={cn(
            PAGE_BUTTON,
            page === number
              ? 'bg-primary font-semibold text-white'
              : 'text-muted hover:bg-neutral-100 hover:text-foreground',
          )}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        disabled={loading || !hasNextGroup}
        onClick={() => onPageChange(groupEnd + 1)}
        className={cn(
          PAGE_BUTTON,
          'text-muted hover:bg-neutral-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
        )}
        aria-label={`${groupEnd + 1}~${Math.min(groupEnd + PAGES_PER_GROUP, totalPages)}페이지 보기`}
      >
        »
      </button>
      <button
        type="button"
        disabled={loading || page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className={cn(
          PAGE_BUTTON,
          'text-muted hover:bg-neutral-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        다음
      </button>
    </nav>
  );
}

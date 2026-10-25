'use client';

import {
  RECRUITING_COMPANY_SEGMENT_TABS,
  type RecruitingCompanySegmentId,
} from '@/lib/recruiting-employers/company-segment-tabs';
import { cn } from '@/lib/utils';

type RecruitingCompanySegmentTabBarProps = {
  active: RecruitingCompanySegmentId;
  onChange: (id: RecruitingCompanySegmentId) => void;
  counts: Record<RecruitingCompanySegmentId, number | null>;
  countUnit: '곳' | '건';
  ariaLabel: string;
};

export default function RecruitingCompanySegmentTabBar({
  active,
  onChange,
  counts,
  countUnit,
  ariaLabel,
}: RecruitingCompanySegmentTabBarProps) {
  return (
    <div
      className="flex gap-1 rounded-xl border border-border bg-surface p-1"
      role="tablist"
      aria-label={ariaLabel}
    >
      {RECRUITING_COMPANY_SEGMENT_TABS.map((item) => {
        const selected = active === item.id;
        const count = counts[item.id];
        const countLabel =
          typeof count === 'number' ? `${count.toLocaleString('ko-KR')}${countUnit}` : '—';
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:text-sm',
              selected
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:bg-neutral-100 hover:text-foreground',
            )}
          >
            <span>{item.label}</span>
            <span
              className={cn(
                'text-[11px] font-semibold',
                selected ? 'text-white/90' : 'text-subtle',
              )}
            >
              {countLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

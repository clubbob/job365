'use client';

import { useState } from 'react';
import MultiSelect from '@/components/ui/MultiSelect';
import {
  EMPLOYMENT_TYPES,
  JOB_REGIONS,
  JOB_ROLES,
  QUICK_FILTER_OPTIONS,
  type EmploymentType,
  type JobRegion,
  type JobRole,
  type QuickFilterId,
} from '@/lib/job-board/constants';
import { cn } from '@/lib/utils';

export type JobBoardFilterState = {
  q: string;
  quickFilter: QuickFilterId;
  employmentTypes: EmploymentType[];
  roles: JobRole[];
  regions: JobRegion[];
};

type JobBoardFiltersProps = {
  value: JobBoardFilterState;
  onChange: (next: JobBoardFilterState) => void;
  showQuickFilters?: boolean;
  showDetailButton?: boolean;
};

const searchClassName =
  'h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

const chipClassName =
  'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors';

export default function JobBoardFilters({
  value,
  onChange,
  showQuickFilters = true,
  showDetailButton = true,
}: JobBoardFiltersProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  function patch(partial: Partial<JobBoardFilterState>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="sr-only" htmlFor="job-board-search">채용 공고 검색</label>
      <input
        id="job-board-search"
        type="search"
        value={value.q}
        onChange={(e) => patch({ q: e.target.value })}
        placeholder="회사명, 직무, 지역 검색"
        className={searchClassName}
      />

      {showQuickFilters ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="빠른 필터">
          {QUICK_FILTER_OPTIONS.map((item) => {
            const active = value.quickFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => patch({ quickFilter: item.id })}
                className={cn(
                  chipClassName,
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {showDetailButton ? (
        <div>
          <button
            type="button"
            onClick={() => setDetailOpen((open) => !open)}
            className="rounded-lg border border-border-strong bg-surface px-3.5 py-2 text-sm font-semibold text-foreground transition hover:bg-neutral-50"
          >
            {detailOpen ? '상세 필터 닫기' : '상세 필터'}
          </button>

          {detailOpen ? (
            <div className="mt-3 grid gap-3 rounded-xl border border-border bg-neutral-50/80 p-3 sm:grid-cols-2">
              <MultiSelect
                id="job-board-region-filter"
                label="지역"
                allLabel="지역 전체"
                options={JOB_REGIONS}
                selected={value.regions}
                onChange={(regions) => patch({ regions })}
              />
              <MultiSelect
                id="job-board-role-filter"
                label="직무"
                allLabel="직무 전체"
                options={JOB_ROLES}
                selected={value.roles}
                onChange={(roles) => patch({ roles })}
              />
              <MultiSelect
                id="job-board-employment-type-filter"
                label="고용 형태"
                allLabel="고용 형태 전체"
                options={EMPLOYMENT_TYPES}
                selected={value.employmentTypes}
                onChange={(employmentTypes) => patch({ employmentTypes })}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

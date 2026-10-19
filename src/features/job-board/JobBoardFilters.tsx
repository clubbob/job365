'use client';

import MultiSelect from '@/components/ui/MultiSelect';
import {
  EMPLOYMENT_TYPES,
  JOB_REGIONS,
  JOB_ROLES,
  type EmploymentType,
  type JobRegion,
  type JobRole,
} from '@/lib/job-board/constants';
import {
  JOB_BOARD_COMPANY_SEGMENTS,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';

export type JobBoardFilterState = {
  q: string;
  employmentTypes: EmploymentType[];
  companySegments: JobBoardCompanySegment[];
  roles: JobRole[];
  regions: JobRegion[];
};

type JobBoardFiltersProps = {
  value: JobBoardFilterState;
  onChange: (next: JobBoardFilterState) => void;
  /** 맞춤 채용 공고: 검색창만 */
  variant?: 'full' | 'searchOnly';
  showDetailButton?: boolean;
};

const searchClassName =
  'h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

export default function JobBoardFilters({
  value,
  onChange,
  variant = 'full',
  showDetailButton = true,
}: JobBoardFiltersProps) {
  const searchOnly = variant === 'searchOnly';
  const showDetailFilters = showDetailButton && !searchOnly;

  function patch(partial: Partial<JobBoardFilterState>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="sr-only" htmlFor="job-board-search">
        {searchOnly ? '맞춤 채용 공고 검색' : '채용 공고 검색'}
      </label>
      <input
        id="job-board-search"
        type="search"
        value={value.q}
        onChange={(e) => patch({ q: e.target.value })}
        placeholder={
          searchOnly ? '채용 회사명, 공고 제목 검색' : '채용 회사명, 공고 제목, 직무, 지역 검색'
        }
        className={searchClassName}
      />

      {showDetailFilters ? (
        <div className="rounded-xl border border-border bg-neutral-50/80 p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MultiSelect
              id="job-board-region-filter"
              label="지역"
              allLabel="전체"
              options={JOB_REGIONS}
              selected={value.regions}
              onChange={(regions) => patch({ regions })}
            />
            <MultiSelect
              id="job-board-role-filter"
              label="직무"
              allLabel="전체"
              options={JOB_ROLES}
              selected={value.roles}
              onChange={(roles) => patch({ roles })}
            />
            <MultiSelect
              id="job-board-company-segment-filter"
              label="회사 분류"
              allLabel="전체"
              options={JOB_BOARD_COMPANY_SEGMENTS}
              selected={value.companySegments}
              onChange={(companySegments) => patch({ companySegments })}
            />
            <MultiSelect
              id="job-board-employment-type-filter"
              label="채용 형태"
              allLabel="전체"
              options={EMPLOYMENT_TYPES}
              selected={value.employmentTypes}
              onChange={(employmentTypes) => patch({ employmentTypes })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

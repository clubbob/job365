'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import MultiSelect from '@/components/ui/MultiSelect';
import JobCard from '@/features/jobs/JobCard';
import { loadListRestore, saveListRestore, saveListScroll } from '@/lib/list-restore';
import { listJobs } from '@/lib/job-catalog';
import { cn } from '@/lib/utils';
import {
  isOccupationOption,
  isRegionOption,
  jobMatchesOccupation,
  jobMatchesRegion,
  OCCUPATION_OPTIONS,
  REGION_OPTIONS,
  type OccupationOption,
  type RegionOption,
} from '@/lib/work-preferences';
import {
  JOB_WORK_TYPES,
  WORK_TYPE_FILTERS,
  WORK_TYPE_LABELS,
  isJobWorkType,
  jobMatchesWorkType,
  type JobPosting,
  type JobWorkType,
} from '@/types/job';

type FilterId = (typeof WORK_TYPE_FILTERS)[number]['id'];

const PAGE_BUTTON =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors';

const searchControlClassName =
  'h-9 w-full rounded-lg border border-border-strong bg-surface px-2.5 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

const EMPTY_JOBS: JobPosting[] = [];

function restoredWorkTypes(state: {
  workTypes?: string[];
  filter?: FilterId;
}): JobWorkType[] {
  const fromList = (state.workTypes ?? []).filter(isJobWorkType);
  if (fromList.length > 0) return fromList;
  return state.filter && isJobWorkType(state.filter) ? [state.filter] : [];
}

function restoredOccupations(state: { occupations?: string[]; occupation?: string }): OccupationOption[] {
  const fromList = (state.occupations ?? []).filter(isOccupationOption);
  if (fromList.length > 0) return fromList;
  return isOccupationOption(state.occupation) ? [state.occupation] : [];
}

function restoredRegions(state: { regions?: string[]; region?: string }): RegionOption[] {
  const fromList = (state.regions ?? []).filter(isRegionOption);
  if (fromList.length > 0) return fromList;
  return isRegionOption(state.region) ? [state.region] : [];
}

export default function JobList({
  limit,
  pageSize,
  persistKey,
  showSearch = false,
  showCount = false,
  workType,
  hideFilters = false,
  filterAsLinks = false,
  showInfeed = true,
}: {
  limit?: number;
  pageSize?: number;
  persistKey?: string;
  showSearch?: boolean;
  showCount?: boolean;
  workType?: JobWorkType;
  hideFilters?: boolean;
  filterAsLinks?: boolean;
  showInfeed?: boolean;
}) {
  const [allJobs, setAllJobs] = useState<JobPosting[]>(EMPTY_JOBS);
  const [filter, setFilter] = useState<FilterId>(workType ?? 'all');
  const [workTypes, setWorkTypes] = useState<JobWorkType[]>([]);
  const [occupations, setOccupations] = useState<OccupationOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(!persistKey);
  const skipPageReset = useRef(Boolean(persistKey));

  const filtered = useMemo(() => {
    const selected = WORK_TYPE_FILTERS.find((item) => item.id === filter);
    const keyword = query.trim().toLowerCase();

    return allJobs.filter((job) => {
      if (workType) {
        if (!jobMatchesWorkType(job, workType)) return false;
      } else if (showSearch) {
        if (workTypes.length > 0 && !workTypes.some((item) => jobMatchesWorkType(job, item))) return false;
      } else if (selected?.types && !selected.types.some((item) => jobMatchesWorkType(job, item))) {
        return false;
      }
      if (occupations.length > 0 && !occupations.some((item) => jobMatchesOccupation(job, item))) return false;
      if (regions.length > 0 && !regions.some((item) => jobMatchesRegion(job, item))) return false;
      if (!keyword) return true;
      return job.companyName.toLowerCase().includes(keyword);
    });
  }, [filter, occupations, query, regions, showSearch, workType, workTypes, allJobs]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;

  useEffect(() => {
    setAllJobs(listJobs());
  }, []);

  useEffect(() => {
    if (!persistKey) return;
    const restored = loadListRestore(persistKey);
    if (restored) {
      setFilter(restored.filter);
      setWorkTypes(restoredWorkTypes(restored));
      setOccupations(restoredOccupations(restored));
      setRegions(restoredRegions(restored));
      setQuery(restored.query);
      setPage(restored.page);
    }
    setReady(true);
  }, [persistKey]);

  useEffect(() => {
    if (!ready) return;
    if (skipPageReset.current) {
      skipPageReset.current = false;
      return;
    }
    setPage(1);
  }, [filter, occupations, query, ready, regions, workTypes]);

  useEffect(() => {
    if (!persistKey || !ready) return;
    saveListRestore(persistKey, {
      filter: workTypes[0] ?? (showSearch ? 'all' : filter),
      workTypes,
      occupation: occupations[0] ?? '',
      occupations,
      region: regions[0] ?? '',
      regions,
      query,
      page,
      scrollY: loadListRestore(persistKey)?.scrollY ?? window.scrollY,
    });
  }, [filter, occupations, page, persistKey, query, ready, regions, workTypes]);

  useEffect(() => {
    if (!persistKey || !ready) return;
    const y = loadListRestore(persistKey)?.scrollY ?? 0;
    if (y <= 0) return;
    const timer = window.setTimeout(() => window.scrollTo(0, y), 0);
    return () => window.clearTimeout(timer);
  }, [persistKey, ready]);

  useEffect(() => {
    if (!persistKey) return;
    const key = persistKey;
    function onScroll() {
      saveListScroll(key, window.scrollY);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [persistKey]);

  const jobs = useMemo(() => {
    if (limit) return filtered.slice(0, limit);
    if (pageSize) {
      const start = (page - 1) * pageSize;
      return filtered.slice(start, start + pageSize);
    }
    return filtered;
  }, [filtered, limit, page, pageSize]);

  const hasQuery = query.trim().length > 0;
  const hasExtraFilters = workTypes.length > 0 || occupations.length > 0 || regions.length > 0;

  function goToPage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function rememberListPosition() {
    if (!persistKey) return;
    saveListScroll(persistKey, window.scrollY);
  }

  return (
    <section className="space-y-3">
      {showSearch ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <MultiSelect
            id="job-work-type-filter"
            label="근무 형태"
            allLabel="근무 형태 전체"
            options={JOB_WORK_TYPES}
            selected={workTypes}
            labelOf={(value) => WORK_TYPE_LABELS[value]}
            onChange={setWorkTypes}
          />
          <MultiSelect
            id="job-region-filter"
            label="근무 지역"
            allLabel="근무 지역 전체"
            options={REGION_OPTIONS}
            selected={regions}
            onChange={setRegions}
          />
          <MultiSelect
            id="job-occupation-filter"
            label="직종"
            allLabel="직종 전체"
            options={OCCUPATION_OPTIONS}
            selected={occupations}
            onChange={setOccupations}
          />
          <div>
            <label className="sr-only" htmlFor="job-search">
              회사명
            </label>
            <input
              id="job-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="회사명"
              className={searchControlClassName}
            />
          </div>
        </div>
      ) : null}

      {!showSearch && !hideFilters ? (
      <div className="grid grid-cols-5 gap-1.5 pb-1 sm:flex sm:flex-wrap sm:gap-2">
        {WORK_TYPE_FILTERS.map((item) => {
          const href = item.id === 'all' ? '/jobs' : `/categories/${item.id}`;
          const active = filterAsLinks ? item.id === 'all' : filter === item.id;
          const className = cn(
            'inline-flex w-full items-center justify-center rounded-full border px-1.5 py-1.5 text-center text-xs font-medium transition-colors sm:w-auto sm:shrink-0 sm:px-3 sm:text-sm',
            active
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground',
          );

          if (filterAsLinks) {
            return (
              <Link key={item.id} href={href} className={className}>
                {item.label}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={className}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      ) : null}

      {showCount ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            채용 정보 <span className="font-semibold text-foreground">{filtered.length}</span>건
          </p>
          <p className="text-xs text-subtle">{pageSize && totalPages > 1 ? `${page}/${totalPages}페이지 · 최신순` : '최신순'}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {jobs.map((job, index) => (
          <Fragment key={job.id}>
            <JobCard
              job={job}
              onNavigate={persistKey ? rememberListPosition : undefined}
            />
            {index === 1 && showInfeed ? <AdSlot className="col-span-2" placement="infeed" /> : null}
          </Fragment>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <p className="text-sm text-muted">
            {hasQuery || hasExtraFilters ? '검색 조건에 맞는 채용 정보가 없습니다.' : '해당 조건의 채용 정보가 없습니다.'}
          </p>
          {hasQuery || hasExtraFilters || filter !== 'all' ? (
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-primary hover:underline"
              onClick={() => {
                setFilter('all');
                setWorkTypes([]);
                setOccupations([]);
                setRegions([]);
                setQuery('');
              }}
            >
              조건 초기화
            </button>
          ) : null}
        </div>
      ) : null}

      {pageSize && filtered.length > pageSize ? (
        <nav className="flex flex-wrap items-center justify-center gap-1 pt-1" aria-label="채용 정보 페이지">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className={cn(
              PAGE_BUTTON,
              'text-muted hover:bg-neutral-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              type="button"
              aria-current={page === number ? 'page' : undefined}
              onClick={() => goToPage(number)}
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
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className={cn(
              PAGE_BUTTON,
              'text-muted hover:bg-neutral-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            다음
          </button>
        </nav>
      ) : null}
    </section>
  );
}

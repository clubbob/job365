'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import JobCard from '@/features/jobs/JobCard';
import { loadListRestore, saveListRestore, saveListScroll } from '@/lib/list-restore';
import { listJobs } from '@/lib/job-catalog';
import { jobSearchText } from '@/lib/job-display';
import { SAMPLE_JOBS } from '@/lib/sample-jobs';
import { cn } from '@/lib/utils';
import { WORK_TYPE_FILTERS, jobMatchesWorkType, type JobWorkType } from '@/types/job';

type FilterId = (typeof WORK_TYPE_FILTERS)[number]['id'];

const PAGE_BUTTON =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors';

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
  const [allJobs, setAllJobs] = useState(SAMPLE_JOBS);
  const [filter, setFilter] = useState<FilterId>(workType ?? 'all');
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
      } else if (selected?.types && !selected.types.some((item) => jobMatchesWorkType(job, item))) {
        return false;
      }
      if (!keyword) return true;

      const haystack = jobSearchText(job).toLowerCase();
      return haystack.includes(keyword);
    });
  }, [filter, query, workType, allJobs]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;

  useEffect(() => {
    setAllJobs(listJobs());
  }, []);

  useEffect(() => {
    if (!persistKey) return;
    const restored = loadListRestore(persistKey);
    if (restored) {
      setFilter(restored.filter);
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
  }, [filter, query, ready]);

  useEffect(() => {
    if (!persistKey || !ready) return;
    saveListRestore(persistKey, {
      filter,
      query,
      page,
      scrollY: loadListRestore(persistKey)?.scrollY ?? window.scrollY,
    });
  }, [filter, page, persistKey, query, ready]);

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

  function goToPage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function rememberListPosition() {
    if (!persistKey) return;
    saveListScroll(persistKey, window.scrollY);
  }

  return (
    <section className="space-y-4">
      {showSearch ? (
        <div>
          <label htmlFor="job-search" className="sr-only">
            채용 정보 검색
          </label>
          <input
            id="job-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="직무, 회사, 지역으로 검색"
            className="w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      ) : null}

      {!hideFilters ? (
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {WORK_TYPE_FILTERS.map((item) => {
          const href = item.id === 'all' ? '/jobs' : `/categories/${item.id}`;
          const active = filterAsLinks ? item.id === 'all' : filter === item.id;
          const className = cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
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
            {hasQuery ? '검색 조건에 맞는 채용 정보가 없습니다.' : '해당 조건의 채용 정보가 없습니다.'}
          </p>
          {hasQuery || filter !== 'all' ? (
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-primary hover:underline"
              onClick={() => {
                setFilter('all');
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

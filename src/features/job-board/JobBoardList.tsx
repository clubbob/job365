'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdSlot from '@/components/ads/AdSlot';
import { FormFeedback } from '@/components/ui/FormFeedback';
import CrawledJobCard from '@/features/job-board/CrawledJobCard';
import JobBoardFilters, { type JobBoardFilterState } from '@/features/job-board/JobBoardFilters';
import { useAuth } from '@/features/auth/auth-context';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';
import { MATCHED_JOBS_SETTINGS_TITLE } from '@/lib/site-menu-copy';
import { JOB_BOARD_RESET_EVENT } from '@/lib/job-board/reset';
import { cn } from '@/lib/utils';
import { dedupeCrawledJobListItems } from '@/lib/job-board/dedupe-list-jobs';
import { CRAWLED_JOB_DETAIL_FROM_MY_JOBS } from '@/lib/job-board/detail-navigation';
import {
  clearJobBoardListRestore,
  loadJobBoardListRestore,
  saveJobBoardListRestore,
  saveJobBoardListScroll,
} from '@/lib/job-board/list-restore';
import type { CrawledJobListItem } from '@/types/crawled-job';

type JobBoardListProps = {
  mode?: 'all' | 'today' | 'matched';
  title?: string;
  description?: string;
  showNewSection?: boolean;
  showFilters?: boolean;
  persistKey?: string;
  pageSize?: number;
  listTitle?: string;
  showCount?: boolean;
  showLoadMore?: boolean;
  listMoreHref?: string;
  hideNewSectionHeader?: boolean;
  /** 서버에서 미리 불러온 첫 페이지(메인 최근 공고 등) */
  prefetchedItems?: CrawledJobListItem[];
};

const EMPTY: CrawledJobListItem[] = [];

const INITIAL_FILTERS: JobBoardFilterState = {
  q: '',
  employmentTypes: [],
  companySegments: [],
  roles: [],
  regions: [],
};

function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-surface p-4">
      <div className="h-4 w-24 rounded bg-neutral-200" />
      <div className="mt-3 h-5 w-full rounded bg-neutral-200" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-32 rounded bg-neutral-100" />
        <div className="h-3 w-28 rounded bg-neutral-100" />
        <div className="h-3 w-20 rounded bg-neutral-100" />
      </div>
    </div>
  );
}

function buildQuery(
  state: JobBoardFilterState,
  page: number,
  todayOnly: boolean,
  pageSize: number,
  searchOnly = false,
) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (searchOnly) return params.toString();
  if (todayOnly) params.set('today', '1');
  for (const item of state.employmentTypes) params.append('employmentType', item);
  for (const item of state.companySegments) params.append('companySegment', item);
  for (const item of state.roles) params.append('role', item);
  for (const item of state.regions) params.append('region', item);
  return params.toString();
}

export default function JobBoardList({
  mode = 'all',
  title,
  description,
  showNewSection = false,
  showFilters = true,
  pageSize = JOB_LIST_PAGE_SIZE,
  listTitle,
  showCount = true,
  showLoadMore = true,
  listMoreHref,
  hideNewSectionHeader = false,
  prefetchedItems,
  persistKey,
}: JobBoardListProps) {
  const { user } = useAuth();
  const [ready, setReady] = useState(() => !persistKey);
  const skipFetchOnceRef = useRef(false);
  const didRestoreScrollRef = useRef(false);
  const [filters, setFilters] = useState<JobBoardFilterState>(INITIAL_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<CrawledJobListItem[]>(prefetchedItems ?? EMPTY);
  const [todayItems, setTodayItems] = useState<CrawledJobListItem[]>(EMPTY);
  const [todayDate, setTodayDate] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(() => (prefetchedItems?.length ?? 0) === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayPage, setTodayPage] = useState(1);
  const [todayHasMore, setTodayHasMore] = useState(false);
  const [noMatches, setNoMatches] = useState(false);

  const todayOnly = mode === 'today';
  /** 맞춤·전체 채용 목록: 페이지당 pageSize건, 이전/다음 (누적 더보기 없음) */
  const pagedMainList = mode === 'matched' || mode === 'all';
  const matchedDetailFrom =
    mode === 'matched' ? CRAWLED_JOB_DETAIL_FROM_MY_JOBS : undefined;

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => window.clearTimeout(handle);
  }, [filters.q]);

  const filtersForFetch = useMemo(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ],
  );

  const todayListQuery = useMemo(
    () => buildQuery(filtersForFetch, todayPage, true, pageSize),
    [filtersForFetch, todayPage, pageSize],
  );

  const matchedSearchOnly = mode === 'matched';

  const mainListQuery = useMemo(
    () => buildQuery(filtersForFetch, page, todayOnly, pageSize, matchedSearchOnly),
    [filtersForFetch, page, todayOnly, pageSize, matchedSearchOnly],
  );

  const todayFetchKey = useMemo(
    () => `${showNewSection}\0${mode}\0${todayListQuery}`,
    [showNewSection, mode, todayListQuery],
  );

  const mainFetchKey = useMemo(
    () => `${mode}\0${user?.uid ?? ''}\0${page}\0${pageSize}\0${mainListQuery}`,
    [mode, user?.uid, page, pageSize, mainListQuery],
  );

  const canUsePrefetchedOnly = useMemo(() => {
    if (!prefetchedItems?.length || page !== 1 || mode !== 'all' || todayOnly) return false;
    return (
      debouncedQ === '' &&
      filters.employmentTypes.length === 0 &&
      filters.companySegments.length === 0 &&
      filters.roles.length === 0 &&
      filters.regions.length === 0
    );
  }, [prefetchedItems, page, mode, todayOnly, filters, debouncedQ]);

  const resetList = useCallback(() => {
    if (persistKey) clearJobBoardListRestore(persistKey);
    setFilters(INITIAL_FILTERS);
    setDebouncedQ('');
    setPage(1);
    setTodayPage(1);
    setItems(EMPTY);
    setTodayItems(EMPTY);
    setHasMore(false);
    setTodayHasMore(false);
    setTotal(0);
    setError(null);
  }, [persistKey]);

  const persistListSnapshot = useCallback(() => {
    if (!persistKey) return;
    saveJobBoardListRestore(persistKey, {
      mode,
      filters,
      page,
      todayPage,
      items: pagedMainList ? [] : items,
      todayItems,
      hasMore,
      todayHasMore,
      total,
      scrollY: window.scrollY,
      savedAt: Date.now(),
    });
  }, [
    persistKey,
    mode,
    filters,
    page,
    todayPage,
    items,
    todayItems,
    hasMore,
    todayHasMore,
    total,
    pagedMainList,
  ]);

  const rememberListPosition = useCallback(() => {
    if (!persistKey) return;
    saveJobBoardListScroll(persistKey, window.scrollY);
    persistListSnapshot();
  }, [persistKey, persistListSnapshot]);

  const handleFiltersChange = useCallback((next: JobBoardFilterState) => {
    setFilters(next);
    setPage(1);
    setTodayPage(1);
    setError(null);
  }, []);

  useEffect(() => {
    function onReset() {
      resetList();
    }

    window.addEventListener(JOB_BOARD_RESET_EVENT, onReset);
    return () => window.removeEventListener(JOB_BOARD_RESET_EVENT, onReset);
  }, [resetList]);

  useEffect(() => {
    if (!persistKey) {
      setReady(true);
      return;
    }
    const restored = loadJobBoardListRestore(persistKey);
    if (restored && restored.mode === mode) {
      setFilters(restored.filters as JobBoardFilterState);
      setDebouncedQ(restored.filters.q);
      setPage(restored.page);
      if (pagedMainList) {
        setTotal(restored.total);
        setHasMore(restored.hasMore);
        if (mode === 'all') {
          setTodayPage(restored.todayPage);
          setTodayItems(restored.todayItems);
          setTodayHasMore(restored.todayHasMore);
        }
      } else {
        setTodayPage(restored.todayPage);
        setItems(restored.items);
        setTodayItems(restored.todayItems);
        setHasMore(restored.hasMore);
        setTodayHasMore(restored.todayHasMore);
        setTotal(restored.total);
        setLoading(false);
        if (restored.items.length > 0) {
          skipFetchOnceRef.current = true;
        }
      }
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore snapshot once per persistKey/mode
  }, [persistKey, mode]);

  useEffect(() => {
    if (!persistKey || !ready) return;
    persistListSnapshot();
  }, [persistKey, ready, persistListSnapshot]);

  useEffect(() => {
    if (!persistKey || !ready || didRestoreScrollRef.current) return;
    if (items.length === 0) return;
    const y = loadJobBoardListRestore(persistKey)?.scrollY ?? 0;
    if (y <= 0) return;
    didRestoreScrollRef.current = true;
    const timer = window.setTimeout(() => window.scrollTo(0, y), 0);
    return () => window.clearTimeout(timer);
  }, [persistKey, ready, items.length]);

  useEffect(() => {
    if (!persistKey) return;
    const key = persistKey;
    function onScroll() {
      saveJobBoardListScroll(key, window.scrollY);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [persistKey]);

  useEffect(() => {
    if (!showNewSection || mode !== 'all' || hideNewSectionHeader) return;

    const controller = new AbortController();

    async function loadToday() {
      setTodayLoading(true);
      try {
        const todayRes = await fetch(`/api/crawled-jobs?${todayListQuery}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const todayJson = (await todayRes.json()) as {
          ok?: boolean;
          data?: {
            items: CrawledJobListItem[];
            hasMore: boolean;
            todayDate: string;
          };
        };

        if (todayRes.ok && todayJson.ok && todayJson.data) {
          setTodayItems((prev) =>
            todayPage === 1 ? todayJson.data!.items : [...prev, ...todayJson.data!.items],
          );
          setTodayHasMore(todayJson.data.hasMore);
          setTodayDate(todayJson.data.todayDate);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('[job-board] today list failed', err);
      } finally {
        if (!controller.signal.aborted) setTodayLoading(false);
      }
    }

    void loadToday();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayFetchKey bundles query inputs
  }, [todayFetchKey]);

  useEffect(() => {
    if (!ready) return;
    if (skipFetchOnceRef.current) {
      skipFetchOnceRef.current = false;
      return;
    }

    const controller = new AbortController();

    async function load() {
      const isLoadMore = page > 1 && !pagedMainList;
      const silentRefresh = canUsePrefetchedOnly && page === 1 && !isLoadMore;
      if (isLoadMore) {
        setLoadingMore(true);
      } else if (!silentRefresh || (pagedMainList && page > 1)) {
        setLoading(true);
      }
      setError(null);

      try {
        if (mode === 'matched') {
          if (!user) {
            setItems([]);
            setTotal(0);
            setHasMore(false);
            setLoading(false);
            return;
          }

          const token = await user.getIdToken();
          const res = await fetch(`/api/crawled-jobs/matched?${mainListQuery}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
              cache: 'no-store',
            },
          );
          const json = (await res.json()) as {
            ok?: boolean;
            data?: {
              items: CrawledJobListItem[];
              total: number;
              hasMore: boolean;
              noMatches?: boolean;
            };
            error?: { message?: string };
          };

          if (!res.ok || !json.ok || !json.data) {
            throw new Error(json.error?.message ?? '맞춤 채용 공고를 불러오지 못했습니다.');
          }

          setItems(dedupeCrawledJobListItems(json.data!.items));
          setTotal(json.data.total);
          setHasMore(json.data.hasMore);
          setNoMatches(Boolean(json.data.noMatches));
          return;
        }

        const res = await fetch(`/api/crawled-jobs?${mainListQuery}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: {
            items: CrawledJobListItem[];
            total: number;
            hasMore: boolean;
            todayDate: string;
          };
          error?: { message?: string };
        };

        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.error?.message ?? '채용 공고를 불러오지 못했습니다.');
        }

        setItems((prev) =>
          dedupeCrawledJobListItems(
            pagedMainList
              ? json.data!.items
              : page === 1
                ? json.data!.items
                : [...prev, ...json.data!.items],
          ),
        );
        setTotal(json.data.total);
        setHasMore(json.data.hasMore);
        setTodayDate(json.data.todayDate);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '채용 공고를 불러오지 못했습니다.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    void load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mainFetchKey bundles list query inputs
  }, [mainFetchKey, canUsePrefetchedOnly, ready]);

  const countLabel = useMemo(() => {
    if (loading && items.length === 0) return '불러오는 중…';
    const totalLabel = total.toLocaleString('ko-KR');
    if (loading) return `모집 중 총 ${totalLabel}건 · 갱신 중…`;
    return `모집 중 총 ${totalLabel}건`;
  }, [loading, total, items.length]);

  return (
    <div className="flex flex-col gap-5">
      {title ? (
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      ) : null}

      <AdSlot placement="header" />

      {mode === 'matched' && noMatches && !loading ? (
        <p className="rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm text-muted">
          {MATCHED_JOBS_SETTINGS_TITLE}에 맞는 공고가 없습니다. 조건을 바꾸려면{' '}
          <a href="/mypage?tab=alerts" className="font-semibold text-primary hover:underline">
            {MATCHED_JOBS_SETTINGS_TITLE}
          </a>
          을 확인해 주세요.
        </p>
      ) : null}

      {showFilters ? (
        <JobBoardFilters
          value={filters}
          onChange={handleFiltersChange}
          variant={matchedSearchOnly ? 'searchOnly' : 'full'}
        />
      ) : null}

      {showNewSection && mode === 'all' && !hideNewSectionHeader ? (
        <section
          className={
            hideNewSectionHeader
              ? 'flex flex-col gap-3'
              : 'flex flex-col gap-3 border-t border-border pt-8'
          }
        >
          {!hideNewSectionHeader ? (
            <h2 className="text-lg font-bold text-foreground">오늘의 신규 채용 공고</h2>
          ) : null}

          {todayItems.length === 0 && !todayLoading ? (
            <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
              오늘 새로 수집된 공고가 없습니다.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayItems.map((job) => (
                <CrawledJobCard
                  key={job.id}
                  job={job}
                  todayDate={todayDate}
                  onNavigate={persistKey ? rememberListPosition : undefined}
                  detailFrom={matchedDetailFrom}
                />
              ))}
            </div>
          )}

          {todayHasMore ? (
            <button
              type="button"
              disabled={todayLoading}
              onClick={() => setTodayPage((p) => p + 1)}
              className="mx-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
            >
              더보기
            </button>
          ) : null}
        </section>
      ) : null}

      <section
        className={
          showNewSection && mode === 'all'
            ? 'flex flex-col gap-3 border-t border-border pt-8'
            : 'flex flex-col gap-3'
        }
      >
        {listTitle ? (
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">{listTitle}</h2>
            {listMoreHref ? (
              <Link
                href={listMoreHref}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                전체 보기
              </Link>
            ) : null}
          </div>
        ) : mode === 'all' && showNewSection ? (
          <h2 className="text-lg font-bold text-foreground">전체 채용 공고</h2>
        ) : null}

        {showCount ? <p className="text-sm text-muted">{countLabel}</p> : null}
        {!showCount && loading && items.length === 0 ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : null}

        {error ? (
          <FormFeedback variant="error">{error}</FormFeedback>
        ) : null}

        {loading && items.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: pageSize }, (_, index) => (
              <JobCardSkeleton key={index} />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div
            className={cn(
              'grid gap-3 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3',
              loading && 'pointer-events-none opacity-55',
            )}
            aria-busy={loading}
          >
            {items.map((job) => (
              <CrawledJobCard
                key={job.id}
                job={job}
                todayDate={todayDate}
                onNavigate={persistKey ? rememberListPosition : undefined}
                detailFrom={matchedDetailFrom}
              />
            ))}
          </div>
        ) : null}

        {!loading && items.length === 0 && !error && mode !== 'matched' ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            조건에 맞는 채용 공고가 없습니다.
          </p>
        ) : null}

        {pagedMainList && (page > 1 || hasMore) && showLoadMore ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {page > 1 ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-neutral-50 disabled:opacity-60"
              >
                이전
              </button>
            ) : null}
            {hasMore ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
              >
                {loading ? '불러오는 중…' : '다음'}
              </button>
            ) : null}
          </div>
        ) : null}
        {!pagedMainList && hasMore && showLoadMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => setPage((p) => p + 1)}
            className="mx-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
          >
            {loadingMore ? '불러오는 중…' : '더보기'}
          </button>
        ) : null}
      </section>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdSlot from '@/components/ads/AdSlot';
import CrawledJobCard from '@/features/job-board/CrawledJobCard';
import JobBoardFilters, { type JobBoardFilterState } from '@/features/job-board/JobBoardFilters';
import { useAuth } from '@/features/auth/auth-context';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';
import type { CrawledJobListItem } from '@/types/crawled-job';

type JobBoardListProps = {
  mode?: 'all' | 'today' | 'matched';
  title?: string;
  description?: string;
  showNewSection?: boolean;
  showFilters?: boolean;
  persistKey?: string;
  pageSize?: number;
};

const EMPTY: CrawledJobListItem[] = [];

function buildQuery(state: JobBoardFilterState, page: number, todayOnly: boolean, pageSize: number) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.quickFilter !== 'all') params.set('quick', state.quickFilter);
  if (todayOnly) params.set('today', '1');
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  for (const item of state.employmentTypes) params.append('employmentType', item);
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
}: JobBoardListProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<JobBoardFilterState>({
    q: '',
    quickFilter: 'all',
    employmentTypes: [],
    roles: [],
    regions: [],
  });
  const [items, setItems] = useState<CrawledJobListItem[]>(EMPTY);
  const [todayItems, setTodayItems] = useState<CrawledJobListItem[]>(EMPTY);
  const [todayDate, setTodayDate] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [todayLoading, setTodayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayPage, setTodayPage] = useState(1);
  const [todayHasMore, setTodayHasMore] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const todayOnly = mode === 'today';

  const todayListQuery = useMemo(
    () => buildQuery(filters, todayPage, true, pageSize),
    [filters, todayPage, pageSize],
  );

  const mainListQuery = useMemo(
    () => buildQuery(filters, page, todayOnly, pageSize),
    [filters, page, todayOnly, pageSize],
  );

  const todayFetchKey = useMemo(
    () => `${showNewSection}\0${mode}\0${todayListQuery}`,
    [showNewSection, mode, todayListQuery],
  );

  const mainFetchKey = useMemo(
    () => `${mode}\0${user?.uid ?? ''}\0${page}\0${pageSize}\0${mainListQuery}`,
    [mode, user?.uid, page, pageSize, mainListQuery],
  );

  const handleFiltersChange = useCallback((next: JobBoardFilterState) => {
    setFilters(next);
    setPage(1);
    setTodayPage(1);
    setItems(EMPTY);
    setTodayItems(EMPTY);
    setHasMore(false);
    setTodayHasMore(false);
    setTotal(0);
  }, []);

  useEffect(() => {
    if (!showNewSection || mode !== 'all') return;

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
          setTodayItems(todayJson.data.items);
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
  }, [todayFetchKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
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
          const res = await fetch(
            `/api/crawled-jobs/matched?page=${page}&pageSize=${pageSize}`,
            {
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
              usedFallback?: boolean;
            };
            error?: { message?: string };
          };

          if (!res.ok || !json.ok || !json.data) {
            throw new Error(json.error?.message ?? '내 채용 공고를 불러오지 못했습니다.');
          }

          setItems(json.data.items);
          setTotal(json.data.total);
          setHasMore(json.data.hasMore);
          setUsedFallback(Boolean(json.data.usedFallback));
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

        setItems(json.data.items);
        setTotal(json.data.total);
        setHasMore(json.data.hasMore);
        setTodayDate(json.data.todayDate);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '채용 공고를 불러오지 못했습니다.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [mainFetchKey]);

  const countLabel = useMemo(() => {
    if (loading) return '불러오는 중…';
    return `총 ${total}건`;
  }, [loading, total]);

  return (
    <div className="flex flex-col gap-5">
      {title ? (
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      ) : null}

      <AdSlot placement="header" />

      {mode === 'matched' && usedFallback && !loading ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          수신 설정에 맞는 공고가 없어 전체 채용 공고를 보여 드립니다. 조건을 바꾸려면{' '}
          <a href="/mypage?tab=alerts" className="font-semibold text-primary hover:underline">
            마이페이지 수신 설정
          </a>
          을 확인해 주세요.
        </p>
      ) : null}

      {showFilters ? (
        <JobBoardFilters value={filters} onChange={handleFiltersChange} showDetailButton={mode !== 'matched'} />
      ) : null}

      {showNewSection && mode === 'all' ? (
        <section className="flex flex-col gap-3 border-t border-border pt-8">
          <h2 className="text-lg font-bold text-foreground">오늘의 신규 채용 공고</h2>

          {todayItems.length === 0 && !todayLoading ? (
            <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
              오늘 새로 수집된 공고가 없습니다.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayItems.map((job) => (
                <CrawledJobCard key={job.id} job={job} todayDate={todayDate} />
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
        {mode === 'all' && showNewSection ? (
          <h2 className="text-lg font-bold text-foreground">전체 채용 공고</h2>
        ) : null}

        <p className="text-sm text-muted">{countLabel}</p>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((job) => (
            <CrawledJobCard key={job.id} job={job} todayDate={todayDate} />
          ))}
        </div>

        {items.length > 0 ? <AdSlot placement="infeed" /> : null}

        {!loading && items.length === 0 && !error && mode !== 'matched' ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            조건에 맞는 채용 공고가 없습니다.
          </p>
        ) : null}

        {hasMore ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => setPage((p) => p + 1)}
            className="mx-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
          >
            더보기
          </button>
        ) : null}
      </section>
    </div>
  );
}

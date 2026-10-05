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
};

const EMPTY: CrawledJobListItem[] = [];

function buildQuery(state: JobBoardFilterState, page: number, todayOnly: boolean) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.quickFilter !== 'all') params.set('quick', state.quickFilter);
  if (todayOnly) params.set('today', '1');
  params.set('page', String(page));
  params.set('pageSize', String(JOB_LIST_PAGE_SIZE));
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
  const [error, setError] = useState<string | null>(null);
  const [showAllToday, setShowAllToday] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const todayOnly = mode === 'today' || (showNewSection && showAllToday);

  const load = useCallback(async () => {
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
          `/api/crawled-jobs/matched?page=${page}&pageSize=${JOB_LIST_PAGE_SIZE}`,
          { headers: { Authorization: `Bearer ${token}` } },
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
        setLoading(false);
        return;
      }

      const qs = buildQuery(filters, page, todayOnly);
      const res = await fetch(`/api/crawled-jobs?${qs}`);
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

      if (showNewSection && !showAllToday) {
        const todayQs = buildQuery({ ...filters, quickFilter: 'all' }, 1, true);
        const todayRes = await fetch(`/api/crawled-jobs?${todayQs}`);
        const todayJson = (await todayRes.json()) as {
          ok?: boolean;
          data?: { items: CrawledJobListItem[] };
        };
        if (todayRes.ok && todayJson.ok && todayJson.data) {
          setTodayItems(todayJson.data.items.slice(0, JOB_LIST_PAGE_SIZE));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '채용 공고를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filters, page, mode, todayOnly, showNewSection, showAllToday, user]);

  useEffect(() => {
    setPage(1);
  }, [filters, mode, showAllToday]);

  useEffect(() => {
    void load();
  }, [load]);

  const countLabel = useMemo(() => {
    if (loading) return '불러오는 중…';
    return `총 ${total}건`;
  }, [loading, total]);

  const visibleToday = showAllToday ? items : todayItems;

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
        <JobBoardFilters value={filters} onChange={setFilters} showDetailButton={mode !== 'matched'} />
      ) : null}

      {showNewSection && mode === 'all' ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground">오늘의 신규 채용 공고</h2>
            {!showAllToday ? (
              <button
                type="button"
                onClick={() => setShowAllToday(true)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                전체 신규 공고 보기
              </button>
            ) : null}
          </div>

          {visibleToday.length === 0 && !loading ? (
            <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
              오늘 새로 수집된 공고가 없습니다.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleToday.map((job) => (
                <CrawledJobCard key={job.id} job={job} todayDate={todayDate} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {mode === 'all' && showNewSection ? (
        <h2 className="text-lg font-bold text-foreground">전체 채용 공고</h2>
      ) : null}

      <p className="text-sm text-muted">{countLabel}</p>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((job, index) => (
          <div key={job.id} className="contents">
            <CrawledJobCard job={job} todayDate={todayDate} />
            {index === 3 ? <AdSlot placement="infeed" className="sm:col-span-2" /> : null}
          </div>
        ))}
      </div>

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
    </div>
  );
}

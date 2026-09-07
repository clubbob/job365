'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import AdSlot from '@/components/ads/AdSlot';
import TalentCard from '@/features/talents/TalentCard';
import { loadListRestore, saveListRestore, saveListScroll } from '@/lib/list-restore';
import { listTalents } from '@/lib/talent-catalog';
import { cn } from '@/lib/utils';
import { WORK_TYPE_FILTERS } from '@/types/job';

type FilterId = (typeof WORK_TYPE_FILTERS)[number]['id'];

const PAGE_BUTTON =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors';

export default function TalentList({
  pageSize = 10,
  persistKey = 'talents',
}: {
  pageSize?: number;
  persistKey?: string;
}) {
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(!persistKey);
  const skipPageReset = useRef(Boolean(persistKey));

  const filtered = useMemo(() => {
    const selected = WORK_TYPE_FILTERS.find((item) => item.id === filter);
    const keyword = query.trim().toLowerCase();

    return listTalents().filter((talent) => {
      if (selected?.types && !selected.types.includes(talent.workType)) return false;
      if (!keyword) return true;

      const haystack = [
        talent.headline,
        talent.location,
        talent.summary,
        talent.desiredPay,
        talent.careerLabel,
        ...talent.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [filter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

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
    function onScroll() {
      saveListScroll(persistKey, window.scrollY);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [persistKey]);

  const talents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const hasQuery = query.trim().length > 0;

  function goToPage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="space-y-4">
      <div>
        <label htmlFor="talent-search" className="sr-only">
          인재 검색
        </label>
        <input
          id="talent-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름, 직무, 지역으로 검색"
          className="w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {WORK_TYPE_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              filter === item.id
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          인재 <span className="font-semibold text-foreground">{filtered.length}</span>명
        </p>
        <p className="text-xs text-subtle">{totalPages > 1 ? `${page}/${totalPages}페이지 · 최신순` : '최신순'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {talents.map((talent, index) => (
          <Fragment key={talent.id}>
            <TalentCard
              talent={talent}
              onNavigate={persistKey ? () => saveListScroll(persistKey, window.scrollY) : undefined}
            />
            {index === 1 ? <AdSlot className="col-span-2" placement="infeed" /> : null}
          </Fragment>
        ))}
      </div>

      {talents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <p className="text-sm text-muted">
            {hasQuery ? '검색 조건에 맞는 인재가 없습니다.' : '해당 조건의 인재가 없습니다.'}
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

      {filtered.length > pageSize ? (
        <nav className="flex flex-wrap items-center justify-center gap-1 pt-1" aria-label="인재 정보 페이지">
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { ADMIN_CRAWLED_JOBS_PAGE_SIZE } from '@/lib/admin-constants';
import {
  adminDangerActionClassName,
  adminSecondaryActionClassName,
  firebaseAdminUnavailableText,
} from '@/lib/admin-ui';
import { cn } from '@/lib/utils';
import type { CrawledJobListItem, CrawledJobStatus } from '@/types/crawled-job';

type AdminCrawledJob = CrawledJobListItem & {
  sourceId: string;
  displayHidden: boolean;
};

type ListResponse =
  | {
      ok: true;
      data: {
        jobs: AdminCrawledJob[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        firebaseReady?: boolean;
        firebaseAdminMessage?: string | null;
      };
    }
  | { ok: false; error?: { message?: string } };

type StatusFilter = 'all' | CrawledJobStatus;

const PAGE_BUTTON =
  'inline-flex min-w-9 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors';

const PAGES_PER_GROUP = 10;

function getPageGroupRange(currentPage: number, totalPages: number): { groupStart: number; groupEnd: number } {
  const groupStart = Math.floor((currentPage - 1) / PAGES_PER_GROUP) * PAGES_PER_GROUP + 1;
  const groupEnd = Math.min(groupStart + PAGES_PER_GROUP - 1, totalPages);
  return { groupStart, groupEnd };
}

function formatDate(value: string): string {
  const date = value.slice(0, 10);
  return date || value;
}

export default function AdminCrawledJobsClient() {
  const [jobs, setJobs] = useState<AdminCrawledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseAdminMessage, setFirebaseAdminMessage] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ADMIN_CRAWLED_JOBS_PAGE_SIZE),
        status: statusFilter,
      });
      if (debouncedQuery.trim()) {
        params.set('q', debouncedQuery.trim());
      }

      const res = await fetch(`/api/admin/crawled-jobs?${params.toString()}`);
      const json = (await res.json()) as ListResponse;
      if (!res.ok || !json.ok) {
        const message = json.ok === false ? json.error?.message : undefined;
        throw new Error(message ?? '수집 공고를 불러오지 못했습니다.');
      }
      if (!json.data) {
        throw new Error('수집 공고를 불러오지 못했습니다.');
      }

      setJobs(json.data.jobs);
      setTotal(json.data.total);
      setTotalPages(json.data.totalPages);
      setFirebaseAdminMessage(json.data.firebaseReady === false ? json.data.firebaseAdminMessage ?? '' : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '수집 공고를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleClose(job: AdminCrawledJob) {
    if (job.status === 'closed') return;
    if (!window.confirm(`「${job.title}」 공고를 마감 처리할까요? 사이트 목록에서 숨겨집니다.`)) return;

    setPendingId(job.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/crawled-jobs/${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message ?? '마감 처리하지 못했습니다.');
      }

      if (statusFilter === 'active') {
        setJobs((current) => current.filter((item) => item.id !== job.id));
        setTotal((current) => Math.max(0, current - 1));
      } else {
        setJobs((current) =>
          current.map((item) => (item.id === job.id ? { ...item, status: 'closed' } : item)),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '마감 처리하지 못했습니다.');
    } finally {
      setPendingId(null);
    }
  }

  const emptyMessage =
    total === 0 && !debouncedQuery.trim()
      ? statusFilter === 'active'
        ? '모집 중인 수집 채용 공고가 없습니다.'
        : '수집된 채용 공고가 없습니다.'
      : '검색 결과가 없습니다.';

  const isInitialLoad = loading && jobs.length === 0;
  const isRefreshing = loading && jobs.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="수집 채용 공고"
        description="외부 채용 사이트에서 자동 수집한 채용 공고입니다."
        homeHref="/admin"
        homeLabel="관리 홈"
      />

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="sr-only" htmlFor="crawled-job-search">수집 채용 공고 검색</label>
            <input
              id="crawled-job-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목·회사·소스 검색"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="crawled-job-status">상태</label>
            <select
              id="crawled-job-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="active">모집 중</option>
              <option value="closed">마감</option>
              <option value="all">전체 상태</option>
            </select>
          </div>
        </div>

        {total > 0 ? (
          <p className="mb-3 text-xs text-subtle">
            {total.toLocaleString('ko-KR')}건 · {page}/{totalPages}페이지
            {debouncedQuery.trim() ? ' · 검색 결과' : ''}
            {isRefreshing ? ' · 불러오는 중…' : ''}
          </p>
        ) : null}

        {isInitialLoad ? <p className="text-sm text-muted">불러오는 중…</p> : null}
        {firebaseAdminMessage ? (
          <p className="mb-3 text-sm text-muted">{firebaseAdminUnavailableText(firebaseAdminMessage)}</p>
        ) : null}
        {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

        {!loading && jobs.length === 0 ? <p className="text-sm text-muted">{emptyMessage}</p> : null}

        {jobs.length > 0 ? (
          <div className={cn('overflow-x-auto', isRefreshing && 'opacity-60')}>
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-24" />
                <col />
                <col className="w-32" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-44" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="whitespace-nowrap py-2 pr-4 font-semibold">상태</th>
                  <th className="py-2 pr-4 font-semibold">제목</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-semibold">회사</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-semibold">수집 소스</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-semibold">수집일</th>
                  <th className="whitespace-nowrap py-2 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const busy = pendingId === job.id;
                  const canViewOnSite = job.status === 'active' && !job.displayHidden;
                  return (
                    <tr key={job.id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap py-2.5 pr-4 align-middle">
                        <div className="flex flex-nowrap items-center gap-1">
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                              job.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-neutral-100 text-muted',
                            )}
                          >
                            {job.status === 'active' ? '모집 중' : '마감'}
                          </span>
                          {job.displayHidden ? (
                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                              노출 중단
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="min-w-0 truncate py-2.5 pr-4 align-middle font-medium text-foreground" title={job.title}>
                        {canViewOnSite ? (
                          <Link
                            href={`/jobs/${encodeURIComponent(job.id)}`}
                            className="text-foreground hover:text-primary hover:underline"
                          >
                            {job.title}
                          </Link>
                        ) : (
                          <Link
                            href={`/admin/jobs/crawled/${encodeURIComponent(job.id)}`}
                            className="text-foreground hover:text-primary hover:underline"
                          >
                            {job.title}
                          </Link>
                        )}
                      </td>
                      <td
                        className="min-w-0 truncate py-2.5 pr-4 align-middle text-muted"
                        title={job.companyName}
                      >
                        {job.companyName}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-4 align-middle text-muted">{job.sourceName}</td>
                      <td className="whitespace-nowrap py-2.5 pr-4 align-middle text-muted">{formatDate(job.crawledAt)}</td>
                      <td className="whitespace-nowrap py-2.5 align-middle">
                        <div className="flex flex-nowrap items-center gap-1.5">
                          {canViewOnSite ? (
                            <Link href={`/jobs/${encodeURIComponent(job.id)}`} className={adminSecondaryActionClassName}>
                              사용자 화면
                            </Link>
                          ) : job.status === 'closed' ? (
                            <span className="text-xs text-muted">마감됨</span>
                          ) : (
                            <span className="text-xs text-muted">노출 중단</span>
                          )}
                          {job.status === 'active' ? (
                            <button
                              type="button"
                              disabled={busy}
                              className={adminDangerActionClassName}
                              onClick={() => void handleClose(job)}
                            >
                              마감
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {totalPages > 1 ? (() => {
          const { groupStart, groupEnd } = getPageGroupRange(page, totalPages);
          const groupPages = Array.from({ length: groupEnd - groupStart + 1 }, (_, index) => groupStart + index);
          const hasPrevGroup = groupStart > 1;
          const hasNextGroup = groupEnd < totalPages;

          return (
            <nav className="mt-4 flex flex-wrap items-center justify-center gap-1" aria-label="수집 채용 공고 페이지">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                onClick={() => setPage(groupStart - PAGES_PER_GROUP)}
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
                  onClick={() => setPage(number)}
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
                onClick={() => setPage(groupEnd + 1)}
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
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className={cn(
                  PAGE_BUTTON,
                  'text-muted hover:bg-neutral-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                다음
              </button>
            </nav>
          );
        })() : null}
      </Card>
    </div>
  );
}

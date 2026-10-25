'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AdminOpenUserSiteButton from '@/components/admin/AdminOpenUserSiteButton';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { ADMIN_CRAWLED_JOBS_PAGE_SIZE } from '@/lib/admin-constants';
import { adminDangerActionClassName, firebaseAdminUnavailableText } from '@/lib/admin-ui';
import { formatKoreaDateTime } from '@/lib/datetime';
import {
  buildAdminCrawledJobsListSearchParams,
  parseAdminCrawledJobsListSearchParams,
  persistAdminCrawledJobsListReturnState,
  type AdminCrawledJobsListUrlState,
} from '@/lib/admin-crawled-jobs-list-url';
import type { JobBoardCompanySegment } from '@/lib/job-board/company-segment';
import { adminListRowNumberCellClassName, adminPagedRowNumber } from '@/features/admin/AdminRegistryListChrome';
import { cn } from '@/lib/utils';
import type { CrawledJobListItem, CrawledJobStatus } from '@/types/crawled-job';

type AdminCrawledJob = CrawledJobListItem & {
  sourceId: string;
  displayHidden: boolean;
};

type BoardFilter = 'all' | 'on_board' | 'off_board';

type ListResponse =
  | {
      ok: true;
      data: {
        jobs: AdminCrawledJob[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        counts?: {
          storedActive: number;
          boardVisible: number;
        };
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

export type AdminCrawledJobsListMode = 'stored' | 'browsable';

export default function AdminCrawledJobsClient({
  listMode = 'stored',
  companySegment,
  embeddedInSegmentPanel = false,
}: {
  listMode?: AdminCrawledJobsListMode;
  companySegment?: JobBoardCompanySegment;
  /** 회사 분류 탭 패널 안 — 페이지 헤더·전체 합계 문구 숨김 */
  embeddedInSegmentPanel?: boolean;
} = {}) {
  const browsableOnly = listMode === 'browsable';
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const initialList = parseAdminCrawledJobsListSearchParams(searchParams, browsableOnly);
  const [jobs, setJobs] = useState<AdminCrawledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseAdminMessage, setFirebaseAdminMessage] = useState('');
  const [query, setQuery] = useState(initialList.q);
  const [debouncedQuery, setDebouncedQuery] = useState(initialList.q);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialList.status);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>(initialList.board);
  const [page, setPage] = useState(initialList.page);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [jobCounts, setJobCounts] = useState<{ storedActive: number; boardVisible: number } | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const searchQueryReadyRef = useRef(false);
  const skipDebouncedPageResetRef = useRef(false);

  const pushListUrl = useCallback(
    (state: AdminCrawledJobsListUrlState) => {
      persistAdminCrawledJobsListReturnState(browsableOnly, state);
      const desired = buildAdminCrawledJobsListSearchParams(state);
      const current = searchParams.toString();
      if (desired === current) return;
      const next = desired ? `${pathname}?${desired}` : pathname;
      router.replace(next, { scroll: false });
    },
    [browsableOnly, pathname, router, searchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      if (skipDebouncedPageResetRef.current) {
        skipDebouncedPageResetRef.current = false;
        return;
      }
      if (!searchQueryReadyRef.current) {
        searchQueryReadyRef.current = true;
        return;
      }
      setPage(1);
      pushListUrl({
        page: 1,
        q: query,
        status: statusFilter,
        board: boardFilter,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, statusFilter, boardFilter, pushListUrl]);

  useEffect(() => {
    const parsed = parseAdminCrawledJobsListSearchParams(searchParams, browsableOnly);
    skipDebouncedPageResetRef.current = true;
    setPage(parsed.page);
    setQuery(parsed.q);
    setDebouncedQuery(parsed.q);
    setStatusFilter(parsed.status);
    setBoardFilter(parsed.board);
  }, [searchParams, browsableOnly]);

  const listUrlState = useMemo(
    () => ({
      page,
      q: debouncedQuery,
      status: statusFilter,
      board: boardFilter,
    }),
    [page, debouncedQuery, statusFilter, boardFilter],
  );

  useEffect(() => {
    persistAdminCrawledJobsListReturnState(browsableOnly, listUrlState);
  }, [browsableOnly, listUrlState]);

  function goToPage(nextPage: number) {
    setPage(nextPage);
    pushListUrl({
      page: nextPage,
      q: debouncedQuery,
      status: statusFilter,
      board: boardFilter,
    });
  }

  function changeStatusFilter(next: StatusFilter) {
    setStatusFilter(next);
    setPage(1);
    pushListUrl({
      page: 1,
      q: debouncedQuery,
      status: next,
      board: boardFilter,
    });
  }

  function changeBoardFilter(next: BoardFilter) {
    setBoardFilter(next);
    setPage(1);
    pushListUrl({
      page: 1,
      q: debouncedQuery,
      status: statusFilter,
      board: next,
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    void (async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(ADMIN_CRAWLED_JOBS_PAGE_SIZE),
          status: statusFilter,
          board: boardFilter,
        });
        if (debouncedQuery.trim()) {
          params.set('q', debouncedQuery.trim());
        }
        if (companySegment) {
          params.set('companySegment', companySegment);
        }

        const res = await fetch(`/api/admin/crawled-jobs?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include',
        });
        const json = (await res.json()) as ListResponse;
        if (controller.signal.aborted) return;

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
        setJobCounts(json.data.counts ?? null);
        setFirebaseAdminMessage(json.data.firebaseReady === false ? json.data.firebaseAdminMessage ?? '' : '');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '수집 공고를 불러오지 못했습니다.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [page, statusFilter, boardFilter, debouncedQuery, companySegment]);

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
      ? browsableOnly
        ? '노출 채용 공고가 없습니다.'
        : boardFilter === 'on_board'
          ? '채용 정보에 노출되는 수집 공고가 없습니다.'
          : boardFilter === 'off_board'
            ? '노출 제외된 수집 공고가 없습니다.'
            : statusFilter === 'active'
              ? '모집 중인 수집 채용 공고가 없습니다.'
              : '수집된 채용 공고가 없습니다.'
      : '검색 결과가 없습니다.';

  const isInitialLoad = loading && jobs.length === 0;
  const isRefreshing = loading && jobs.length > 0;

  const listCard = (
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="sr-only" htmlFor="crawled-job-search">수집 채용 공고 검색</label>
            <input
              id="crawled-job-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="공고 제목, 회사, 직무, 지역, 수집 소스 검색"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>
          {!browsableOnly ? (
            <div>
              <label className="sr-only" htmlFor="crawled-job-status">상태</label>
              <select
                id="crawled-job-status"
                value={statusFilter}
                onChange={(event) => changeStatusFilter(event.target.value as StatusFilter)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="active">모집 중</option>
                <option value="closed">마감</option>
                <option value="all">전체 상태</option>
              </select>
            </div>
          ) : null}
          {!browsableOnly ? (
            <div>
              <label className="sr-only" htmlFor="crawled-job-board">노출</label>
              <select
                id="crawled-job-board"
                value={boardFilter}
                onChange={(event) => changeBoardFilter(event.target.value as BoardFilter)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="all">전체 수집</option>
                <option value="on_board">채용 정보 노출</option>
                <option value="off_board">노출 제외</option>
              </select>
            </div>
          ) : null}
        </div>

        {!embeddedInSegmentPanel && browsableOnly && jobCounts ? (
          <p className="mb-2 text-xs text-muted">
            노출 채용 공고 {jobCounts.boardVisible.toLocaleString('ko-KR')}건
            {jobCounts.storedActive > jobCounts.boardVisible
              ? ` · 수집 채용 공고 ${jobCounts.storedActive.toLocaleString('ko-KR')}건 중 노출`
              : ''}
          </p>
        ) : null}
        {!embeddedInSegmentPanel && !browsableOnly && statusFilter === 'active' && jobCounts ? (
          <p className="mb-2 text-xs text-muted">
            수집 채용 공고 {jobCounts.storedActive.toLocaleString('ko-KR')}건 · 노출 채용 공고{' '}
            {jobCounts.boardVisible.toLocaleString('ko-KR')}건
          </p>
        ) : null}

        {total > 0 || debouncedQuery.trim() || boardFilter !== 'all' ? (
          <p className="mb-3 text-xs text-subtle">
            {total.toLocaleString('ko-KR')}건 · {page}/{totalPages}페이지
            {boardFilter === 'on_board' ? ' · 채용 정보 노출' : ''}
            {boardFilter === 'off_board' ? ' · 노출 제외' : ''}
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
                <col className="w-14" />
                <col className="w-24" />
                <col />
                <col className="w-32" />
                <col className="w-44" />
                <col className="w-36" />
                <col className="w-44" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="whitespace-nowrap py-2 pr-4 font-semibold">번호</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-semibold">상태</th>
                  <th className="py-2 pr-4 font-semibold">제목</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-semibold">회사</th>
                  <th className="whitespace-nowrap py-2 pr-6 font-semibold">수집 소스</th>
                  <th className="whitespace-nowrap py-2 pl-2 pr-4 font-semibold">수집일시</th>
                  <th className="whitespace-nowrap py-2 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, index) => {
                  const busy = pendingId === job.id;
                  const canViewOnSite = job.status === 'active' && !job.displayHidden;
                  return (
                    <tr key={job.id} className="border-b border-border last:border-0">
                      <td className={cn(adminListRowNumberCellClassName, 'py-2.5 pr-4 align-middle')}>
                        {adminPagedRowNumber(page, ADMIN_CRAWLED_JOBS_PAGE_SIZE, index).toLocaleString(
                          'ko-KR',
                        )}
                      </td>
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
                        <Link
                          href={(() => {
                            const base = browsableOnly ? '/admin/jobs/browsable' : '/admin/jobs/crawled';
                            const qs = buildAdminCrawledJobsListSearchParams(listUrlState);
                            return `${base}/${encodeURIComponent(job.id)}${qs ? `?${qs}` : ''}`;
                          })()}
                          onClick={() => persistAdminCrawledJobsListReturnState(browsableOnly, listUrlState)}
                          className="text-foreground hover:text-primary hover:underline"
                        >
                          {job.title}
                        </Link>
                      </td>
                      <td
                        className="min-w-0 truncate py-2.5 pr-4 align-middle text-muted"
                        title={job.companyName}
                      >
                        {job.companyName}
                      </td>
                      <td
                        className="min-w-0 max-w-[11rem] truncate py-2.5 pr-6 align-middle text-muted"
                        title={job.sourceName}
                      >
                        {job.sourceName}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pl-2 pr-4 align-middle text-muted">
                        {formatKoreaDateTime(job.crawledAt)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 align-middle">
                        <div className="flex flex-nowrap items-center gap-1.5">
                          {canViewOnSite ? (
                            <AdminOpenUserSiteButton path={`/jobs/${encodeURIComponent(job.id)}`}>
                              사용자 화면
                            </AdminOpenUserSiteButton>
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
                onClick={() => goToPage(Math.max(1, page - 1))}
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
                onClick={() => goToPage(groupStart - PAGES_PER_GROUP)}
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
                disabled={loading || !hasNextGroup}
                onClick={() => goToPage(groupEnd + 1)}
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
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
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
  );

  if (embeddedInSegmentPanel) {
    return listCard;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={browsableOnly ? '노출 채용 공고' : '수집 채용 공고'}
        description={
          browsableOnly
            ? '구직자 채용 정보(/jobs)와 같은 노출·마감·중복 제거 기준 목록입니다.'
            : 'DB 모집 중 수집 공고입니다. 노출 여부는 필터로 구분할 수 있습니다.'
        }
        homeHref="/admin"
        homeLabel="대시보드"
      />
      {listCard}
    </div>
  );
}

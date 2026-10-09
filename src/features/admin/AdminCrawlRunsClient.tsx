'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { ADMIN_CRAWL_RUNS_PAGE_SIZE, ADMIN_CRAWL_RUNS_RETENTION_DAYS } from '@/lib/admin-constants';
import { adminDangerActionClassName, adminJson, adminPrimaryActionClassName } from '@/lib/admin-ui';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';
import { formatInquiryDateTime } from '@/lib/inquiry-display';
import { cn } from '@/lib/utils';

type CrawlSourceResult = {
  sourceName: string;
  fetched: number;
  upserted: number;
  closed: number;
  errors: string[];
};

type CrawlRun = {
  id: string;
  runKind?: 'daily' | 'mid-sized-only';
  startedAt: string;
  finishedAt: string;
  totalUpserted: number;
  totalClosed: number;
  sources: CrawlSourceResult[];
};

type RunResponse =
  | { ok: true; data: { summary: { totalUpserted: number; totalClosed: number } } }
  | { ok: false; error?: { message?: string } };

type GroupedCrawlError = {
  message: string;
  companies: string[];
};

const COMPANY_SAMPLE_IN_GROUP = 8;

function parseCrawlErrorLine(line: string): { company: string; message: string } {
  const trimmed = line.trim();
  if (!trimmed) return { company: '', message: '' };

  const colonParts = trimmed.split(':').map((part) => part.trim());
  if (colonParts.length >= 3 && colonParts[0] === colonParts[1]) {
    return { company: colonParts[0], message: colonParts.slice(2).join(':').trim() };
  }
  if (colonParts.length >= 2) {
    return { company: colonParts[0], message: colonParts.slice(1).join(':').trim() };
  }
  return { company: '', message: trimmed };
}

function groupCrawlErrors(errors: string[]): GroupedCrawlError[] {
  const byMessage = new Map<string, string[]>();

  for (const line of errors) {
    const { company, message } = parseCrawlErrorLine(line);
    const key = message || line.trim();
    if (!key) continue;
    if (!byMessage.has(key)) byMessage.set(key, []);
    if (company && !byMessage.get(key)!.includes(company)) {
      byMessage.get(key)!.push(company);
    }
  }

  return [...byMessage.entries()]
    .map(([message, companies]) => ({
      message,
      companies: companies.sort((a, b) => a.localeCompare(b, 'ko')),
    }))
    .sort((a, b) => b.companies.length - a.companies.length || b.message.length - a.message.length);
}

function sortSourcesForDisplay(sources: CrawlSourceResult[]): CrawlSourceResult[] {
  return [...sources].sort((a, b) => {
    if (b.upserted !== a.upserted) return b.upserted - a.upserted;
    if (b.fetched !== a.fetched) return b.fetched - a.fetched;
    return a.sourceName.localeCompare(b.sourceName, 'ko');
  });
}

function CrawlErrorSummary({ errors }: { errors: string[] }) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => groupCrawlErrors(errors), [errors]);

  if (errors.length === 0) {
    return <span className="text-xs text-subtle">—</span>;
  }

  const ungroupedCount = errors.length - groups.reduce((sum, group) => sum + group.companies.length, 0);

  return (
    <div className="text-left">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-50"
        aria-expanded={open}
      >
        {errors.length.toLocaleString('ko-KR')}건 요약 {open ? '접기' : '보기'}
      </button>
      {open ? (
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-neutral-50/80 p-3 text-xs text-muted">
          {groups.map((group) => (
            <li key={group.message}>
              <p className="font-semibold text-foreground">
                {group.message}
                {group.companies.length > 0 ? (
                  <span className="ml-1 font-normal text-muted">
                    ({group.companies.length.toLocaleString('ko-KR')}곳)
                  </span>
                ) : null}
              </p>
              {group.companies.length > 0 ? (
                <p className="mt-0.5 leading-relaxed">
                  {group.companies.slice(0, COMPANY_SAMPLE_IN_GROUP).join(', ')}
                  {group.companies.length > COMPANY_SAMPLE_IN_GROUP
                    ? ` 외 ${(group.companies.length - COMPANY_SAMPLE_IN_GROUP).toLocaleString('ko-KR')}곳`
                    : ''}
                </p>
              ) : null}
            </li>
          ))}
          {ungroupedCount > 0 ? (
            <li className="text-subtle">회사명 없는 메시지 {ungroupedCount.toLocaleString('ko-KR')}건</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

const PAGE_BUTTON =
  'inline-flex min-w-9 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors';

function CrawlRunCard({ run, defaultExpanded = false }: { run: CrawlRun; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sources = useMemo(() => sortSourcesForDisplay(run.sources), [run.sources]);
  const errorSourceCount = sources.filter((source) => source.errors.length > 0).length;
  const successSourceCount = sources.filter((source) => source.upserted > 0).length;
  const runKindLabel =
    run.runKind === 'mid-sized-only' ? '중견만' : run.runKind === 'daily' ? '일일 전체' : null;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatInquiryDateTime(run.finishedAt || run.startedAt)}
            {runKindLabel ? (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-muted">
                {runKindLabel}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            소스 {sources.length}곳 · 저장 있음 {successSourceCount}곳
            {errorSourceCount > 0 ? ` · 오류 ${errorSourceCount}곳` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted">
            저장 <span className="font-semibold text-foreground">{run.totalUpserted.toLocaleString('ko-KR')}</span>건 ·
            마감 <span className="font-semibold text-foreground">{run.totalClosed.toLocaleString('ko-KR')}</span>건
          </p>
          <span className="text-muted" aria-hidden>{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {expanded ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-subtle">
                <th className="py-2 pr-4 font-semibold">수집 소스</th>
                <th className="whitespace-nowrap py-2 pr-4 font-semibold">수집</th>
                <th className="whitespace-nowrap py-2 pr-4 font-semibold">저장</th>
                <th className="whitespace-nowrap py-2 pr-4 font-semibold">마감</th>
                <th className="py-2 font-semibold">오류·메모</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => {
                const hasErrors = source.errors.length > 0;
                const rowMuted = source.upserted === 0 && source.fetched === 0 && !hasErrors;
                return (
                  <tr
                    key={source.sourceName}
                    className={cn('border-b border-border last:border-0', rowMuted && 'opacity-60')}
                  >
                    <td className="max-w-[14rem] py-2.5 pr-4 align-top font-medium text-foreground">
                      {source.sourceName}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 align-top text-muted">
                      {source.fetched.toLocaleString('ko-KR')}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 align-top">
                      <span
                        className={cn(
                          'font-semibold',
                          source.upserted > 0 ? 'text-primary' : 'text-muted',
                        )}
                      >
                        {source.upserted.toLocaleString('ko-KR')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 align-top text-muted">
                      {source.closed.toLocaleString('ko-KR')}
                    </td>
                    <td className="min-w-[10rem] py-2.5 align-top">
                      <CrawlErrorSummary errors={source.errors} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}

export default function AdminCrawlRunsClient() {
  const [runs, setRuns] = useState<CrawlRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [purging, setPurging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ADMIN_CRAWL_RUNS_PAGE_SIZE),
      });
      const json = await adminJson<{
        ok?: boolean;
        data?: {
          runs: CrawlRun[];
          total: number;
          page: number;
          totalPages: number;
        };
      }>(`/api/admin/crawl-runs?${params.toString()}`);
      if (!json.ok || !json.data) throw new Error('수집 실행 내역을 불러오지 못했습니다.');
      setRuns(json.data.runs);
      setTotal(json.data.total);
      setTotalPages(json.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수집 실행 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePurgeOldRuns() {
    if (purging) return;
    if (
      !window.confirm(
        `${ADMIN_CRAWL_RUNS_RETENTION_DAYS}일보다 오래된 수집 실행 내역을 삭제할까요?\n\n채용 공고 데이터는 그대로 두고, 관리자 로그만 지웁니다. 삭제한 내역은 복구할 수 없습니다.`,
      )
    ) {
      return;
    }

    setPurging(true);
    setError('');
    setRunMessage('');
    try {
      const json = await adminJson<{
        ok?: boolean;
        data?: { deleted: number; olderThanDays: number };
        error?: { message?: string };
      }>('/api/admin/crawl-runs/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: ADMIN_CRAWL_RUNS_RETENTION_DAYS }),
      });
      if (!json.ok || !json.data) {
        throw new Error(json.error?.message ?? '오래된 실행 내역을 삭제하지 못했습니다.');
      }
      setRunMessage(
        `${json.data.olderThanDays}일보다 오래된 실행 내역 ${json.data.deleted.toLocaleString('ko-KR')}건을 삭제했습니다.`,
      );
      if (page !== 1) {
        setPage(1);
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오래된 실행 내역을 삭제하지 못했습니다.');
    } finally {
      setPurging(false);
    }
  }

  async function handleRunNow() {
    if (running) return;
    if (
      !window.confirm(
        '지금 채용 공고 수집을 실행할까요?\n\n대기업·계열은 전부, 중견은 오늘 배치만 순환합니다. 수십 분이 걸릴 수 있습니다.',
      )
    ) {
      return;
    }

    setRunning(true);
    setRunMessage('');
    setError('');
    try {
      const json = await adminJson<RunResponse>('/api/admin/crawl/run', { method: 'POST' });
      if (!json.ok || !json.data) {
        const message = !json.ok ? json.error?.message : undefined;
        throw new Error(message ?? '수집을 실행하지 못했습니다.');
      }
      setRunMessage(
        `수집을 완료했습니다. 저장 ${json.data.summary.totalUpserted}건 · 마감 ${json.data.summary.totalClosed}건`,
      );
      if (page !== 1) {
        setPage(1);
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '수집을 실행하지 못했습니다.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="수집 실행 내역"
        description="대기업·중견기업 채용 사이트 자동 수집 결과와 소스별 저장·마감 건수를 확인합니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">수집 일정</p>
            <p className="mt-1 text-sm text-muted">{CRAWL_SCHEDULE.label}</p>
            <p className="mt-1 text-sm text-muted">{CRAWL_SCHEDULE.detail}</p>
            <p className="mt-1 text-xs text-subtle">
              자동 실행은 {CRAWL_SCHEDULE.runner}에서 최대 {CRAWL_SCHEDULE.maxRunnerMinutes}분까지 돌아갑니다. Vercel
              요금과 무관합니다. 로컬 개발 서버에서는 cron이 돌지 않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRunNow()}
            disabled={running}
            className={adminPrimaryActionClassName}
          >
            {running ? '수집 중…' : '지금 수집 실행'}
          </button>
        </div>
      </Card>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {runMessage ? <p className="text-sm font-medium text-foreground">{runMessage}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {total > 0 ? (
          <p className="text-xs text-subtle">
            실행 {total.toLocaleString('ko-KR')}회 · {page}/{totalPages}페이지
            {loading ? ' · 불러오는 중…' : ''}
          </p>
        ) : (
          <p className="text-xs text-subtle">실행 내역은 관리용 로그입니다. 채용 공고와는 별도로 저장됩니다.</p>
        )}
        <button
          type="button"
          disabled={purging || loading || running}
          onClick={() => void handlePurgeOldRuns()}
          className={adminDangerActionClassName}
        >
          {purging ? '삭제 중…' : `${ADMIN_CRAWL_RUNS_RETENTION_DAYS}일 이전 내역 삭제`}
        </button>
      </div>

      {loading && runs.length === 0 ? <p className="text-sm text-muted">불러오는 중…</p> : null}

      <div className={cn('space-y-3', loading && runs.length > 0 && 'opacity-60')}>
        {runs.map((run, index) => (
          <CrawlRunCard key={run.id} run={run} defaultExpanded={page === 1 && index === 0} />
        ))}
        {!loading && runs.length === 0 ? <p className="text-sm text-muted">실행 내역이 없습니다.</p> : null}
      </div>

      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="수집 실행 내역 페이지">
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
          <span className="text-sm text-muted">{page} / {totalPages}</span>
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
      ) : null}
    </div>
  );
}

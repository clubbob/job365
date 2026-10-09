'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { adminJson, adminPrimaryActionClassName } from '@/lib/admin-ui';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';
import { formatInquiryDateTime } from '@/lib/inquiry-display';

type CrawlRun = {
  id: string;
  startedAt: string;
  finishedAt: string;
  totalUpserted: number;
  totalClosed: number;
  sources: Array<{
    sourceName: string;
    fetched: number;
    upserted: number;
    closed: number;
    errors: string[];
  }>;
};

type RunResponse =
  | { ok: true; data: { summary: { totalUpserted: number; totalClosed: number } } }
  | { ok: false; error?: { message?: string } };

export default function AdminCrawlRunsClient() {
  const [runs, setRuns] = useState<CrawlRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await adminJson<{ ok?: boolean; data?: { runs: CrawlRun[] } }>('/api/admin/crawl-runs');
      if (!json.ok || !json.data) throw new Error('수집 실행 내역을 불러오지 못했습니다.');
      setRuns(json.data.runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수집 실행 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRunNow() {
    if (running) return;
    if (!window.confirm('지금 채용 공고 수집을 실행할까요?\n\n100곳 이상의 채용 사이트를 순회하므로 수 분이 걸릴 수 있습니다.')) {
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
      await load();
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
            <p className="mt-1 text-xs text-subtle">
              자동 실행은 {CRAWL_SCHEDULE.runner}에서 처리합니다. 로컬 개발 서버에서는 cron이 돌지 않습니다.
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

      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {runMessage ? <p className="text-sm font-medium text-foreground">{runMessage}</p> : null}

      <div className="space-y-3">
        {runs.map((run) => (
          <Card key={run.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {formatInquiryDateTime(run.finishedAt || run.startedAt)}
              </p>
              <p className="text-sm text-muted">
                저장 {run.totalUpserted}건 · 마감 {run.totalClosed}건
              </p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {run.sources.map((source) => (
                <li key={source.sourceName}>
                  {source.sourceName}: 수집 {source.fetched}건, 저장 {source.upserted}건, 마감 {source.closed}건
                  {source.errors.length > 0 ? ` · 오류 ${source.errors.join(', ')}` : ''}
                </li>
              ))}
            </ul>
          </Card>
        ))}
        {!loading && runs.length === 0 ? <p className="text-sm text-muted">실행 내역이 없습니다.</p> : null}
      </div>
    </div>
  );
}

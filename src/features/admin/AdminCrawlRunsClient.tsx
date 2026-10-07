'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';

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

export default function AdminCrawlRunsClient() {
  const [runs, setRuns] = useState<CrawlRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/crawl-runs');
        const json = (await res.json()) as { ok?: boolean; data?: { runs: CrawlRun[] } };
        if (!res.ok || !json.ok || !json.data) throw new Error('수집 실행 내역을 불러오지 못했습니다.');
        setRuns(json.data.runs);
      } catch (err) {
        setError(err instanceof Error ? err.message : '수집 실행 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="수집 실행 내역"
        description="자동 수집 cron 실행 결과와 소스별 저장·마감 건수를 확인합니다."
        homeHref="/admin"
        homeLabel="관리 홈"
      />

      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="space-y-3">
        {runs.map((run) => (
          <Card key={run.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{run.finishedAt || run.startedAt}</p>
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

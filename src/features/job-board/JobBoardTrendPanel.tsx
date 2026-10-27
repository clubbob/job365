'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { formatKoreaDateDot, formatKoreaDateRangeDot, formatKoreaDateTime } from '@/lib/datetime';
import { JOB_BOARD_REFRESH_EVENT } from '@/lib/job-board/refresh';
import {
  crawlRunKindLabel,
  jobBoardHrefFromTrendBar,
  type JobBoardTrendBar,
  type JobBoardTrendView,
} from '@/lib/job-board/trend';
import { cn } from '@/lib/utils';

function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${formatCount(delta)}`;
  if (delta < 0) return `−${formatCount(Math.abs(delta))}`;
  return '0';
}

function deltaClassName(delta: number | null): string {
  if (delta == null || delta === 0) return 'text-muted';
  return delta > 0 ? 'text-red-600' : 'text-blue-600';
}

function NetSparkline({ points }: { points: { at: string; net: number }[] }) {
  if (points.length < 2) return null;
  const width = 220;
  const height = 56;
  const values = points.map((item) => item.net);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const yFor = (value: number) => height - ((value - min) / span) * (height - 8) - 4;
  const coords = points.map((item, index) => {
    const x = (index / (points.length - 1)) * width;
    return `${x},${yFor(item.net)}`;
  });
  const zeroY = yFor(0);
  const startAt = points[0]!.at;
  const endAt = points[points.length - 1]!.at;
  const startLabel = formatKoreaDateDot(startAt, { withYear: false });
  const endLabel = formatKoreaDateDot(endAt, { withYear: false });
  const period = formatKoreaDateRangeDot(startAt, endAt);
  return (
    <div className="w-full max-w-[220px]">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-foreground"
        role="img"
        aria-label={`최근 채용 공고 증감, ${period}`}
      >
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="currentColor" strokeOpacity="0.15" />
        <polyline
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={coords.join(' ')}
        />
      </svg>
      <div className="mt-1 flex justify-between gap-2 text-xs tabular-nums text-muted">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}

function TrendBars({
  bars,
  onSelect,
}: {
  bars: JobBoardTrendBar[];
  onSelect: (bar: JobBoardTrendBar) => void;
}) {
  const max = Math.max(...bars.map((bar) => bar.count), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {bars.map((bar) => (
        <li key={`${bar.queryKey}:${bar.key}`}>
          <button
            type="button"
            onClick={() => onSelect(bar)}
            className="group grid w-full min-w-0 cursor-pointer grid-cols-[10rem_minmax(0,1fr)_max-content] items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-neutral-100"
            aria-label={`${bar.label} 채용 정보 ${formatCount(bar.count)}건 보기`}
          >
            <span className="block w-full whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold leading-none text-foreground group-hover:border-primary group-hover:text-primary">
              {bar.label}
            </span>
            <span className="h-2 min-w-0 overflow-hidden rounded-full bg-neutral-100">
              <span
                className="block h-full rounded-full bg-primary/70"
                style={{
                  width: bar.count === 0 ? '0%' : `${Math.max(6, (bar.count / max) * 100)}%`,
                }}
              />
            </span>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-foreground">
              {formatCount(bar.count)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function JobBoardTrendPanel() {
  const router = useRouter();
  const [data, setData] = useState<JobBoardTrendView | null>(null);
  const [error, setError] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    function onRefresh() {
      setRefreshNonce((current) => current + 1);
    }
    window.addEventListener(JOB_BOARD_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(JOB_BOARD_REFRESH_EVENT, onRefresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void fetch('/api/crawled-jobs/trend', { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json()) as { ok?: boolean; data?: JobBoardTrendView };
        if (!res.ok || !json.ok || !json.data) throw new Error('trend');
        setData(json.data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn('[job-board-trend] load failed', err);
        setError(true);
      });
    return () => controller.abort();
  }, [refreshNonce]);

  if (error) {
    return (
      <p className="rounded-xl border border-border bg-neutral-50 px-4 py-6 text-center text-sm text-muted">
        채용 트렌드를 불러오지 못했습니다.
      </p>
    );
  }

  if (!data) {
    return (
      <p className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
        불러오는 중…
      </p>
    );
  }

  function selectBar(bar: JobBoardTrendBar) {
    router.push(jobBoardHrefFromTrendBar(bar));
  }

  const lastCrawl = data.lastCrawl;

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="최근 채용 공고 흐름"
        description="이번 수집 순증감과 어제 노출 공고 대비입니다."
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {lastCrawl ? (
              <>
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className={cn('text-3xl font-bold tabular-nums', deltaClassName(lastCrawl.net))}>
                    {formatDelta(lastCrawl.net)}
                  </span>
                  <span className="text-sm text-muted">건 · 이번 수집</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {crawlRunKindLabel(lastCrawl.runKind)} {formatKoreaDateTime(lastCrawl.finishedAt)} · 추가{' '}
                  {formatCount(lastCrawl.added)}건 · 마감 {formatCount(lastCrawl.closed)}건
                </p>
                {lastCrawl.runKind === 'mid-sized-only' ? (
                  <p className="mt-1 text-xs text-muted">
                    중견기업만 모은 수집입니다. 다른 분류는 이번 수집에 들어가지 않았습니다.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted">아직 비교할 수집 기록이 없습니다.</p>
            )}
          </div>
          <NetSparkline points={data.recentNets} />
        </div>
        {data.hasComparison ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm text-foreground">
              지금 모집 중{' '}
              <span className="font-semibold tabular-nums">{formatCount(data.total)}</span>건
              {data.totalDelta != null ? (
                <>
                  {' '}
                  · 어제 대비{' '}
                  <span className={cn('font-semibold', deltaClassName(data.totalDelta))}>
                    {formatDelta(data.totalDelta)}
                  </span>
                </>
              ) : null}
            </p>
            {data.movers.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold text-subtle">어제보다 늘어난 분류</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.movers.map((bar) => (
                    <button
                      key={`mover:${bar.queryKey}:${bar.key}`}
                      type="button"
                      onClick={() => selectBar(bar)}
                      className="rounded-full border border-border bg-neutral-50 px-3 py-1 text-xs font-semibold text-foreground hover:bg-neutral-100"
                    >
                      {bar.label}{' '}
                      <span className={deltaClassName(bar.delta)}>{formatDelta(bar.delta ?? 0)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card title="현재 노출 채용 공고" description="참고용입니다. 지금 이 사이트에 있는 채용 정보의 분류입니다.">
        <div className="grid gap-5 lg:grid-cols-2">
          {data.groups.map((group) => (
            <div key={group.id} className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">{group.label}</h3>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatCount(data.total)}
                </span>
              </div>
              <TrendBars bars={group.bars} onSelect={selectBar} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

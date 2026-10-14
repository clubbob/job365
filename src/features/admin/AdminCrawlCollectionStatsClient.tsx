'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import type { DailyCrawlCollectionStatPoint } from '@/lib/crawl-collection-daily-stats';
import { cn } from '@/lib/utils';

const DAY_OPTIONS = [14, 30, 60, 90] as const;

type SeriesKey = 'total' | 'enterprise' | 'midSized' | 'it';

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: 'total', label: '전체', color: '#1e293b' },
  { key: 'enterprise', label: '대기업·계열사', color: '#2563eb' },
  { key: 'midSized', label: '중견기업', color: '#d97706' },
  { key: 'it', label: 'IT 기업', color: '#059669' },
];

const CHART_WIDTH = 880;
const CHART_HEIGHT = 300;
const PADDING = { top: 16, right: 16, bottom: 44, left: 48 };

function formatAxisDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${month}/${day}`;
}

function DailyCollectionChart({ series }: { series: DailyCrawlCollectionStatPoint[] }) {
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const maxValue = useMemo(() => {
    let max = 0;
    for (const point of series) {
      max = Math.max(max, point.total, point.enterprise, point.midSized, point.it);
    }
    return max > 0 ? max : 1;
  }, [series]);

  const xAt = (index: number) => {
    if (series.length <= 1) return PADDING.left + plotWidth / 2;
    return PADDING.left + (index / (series.length - 1)) * plotWidth;
  };

  const yAt = (value: number) => PADDING.top + plotHeight - (value / maxValue) * plotHeight;

  const lines = SERIES.map((item) => {
    const points = series
      .map((row, index) => `${xAt(index)},${yAt(row[item.key])}`)
      .join(' ');
    return { ...item, points };
  });

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: Math.round(maxValue * ratio),
    y: yAt(maxValue * ratio),
  }));

  const xLabelIndexes =
    series.length <= 8
      ? series.map((_, index) => index)
      : series.map((_, index) => index).filter((index) => index % Math.ceil(series.length / 8) === 0);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="min-w-full max-w-full text-xs text-muted"
        role="img"
        aria-label="일별 수집 채용 공고 건수 그래프"
      >
        {yTicks.map((tick) => (
          <g key={tick.ratio}>
            <line
              x1={PADDING.left}
              x2={CHART_WIDTH - PADDING.right}
              y1={tick.y}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.12}
            />
            <text x={PADDING.left - 8} y={tick.y + 4} textAnchor="end" fill="currentColor">
              {tick.value.toLocaleString('ko-KR')}
            </text>
          </g>
        ))}

        {lines.map((line) => (
          <polyline
            key={line.key}
            fill="none"
            stroke={line.color}
            strokeWidth={line.key === 'total' ? 2.5 : 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={line.points}
            opacity={line.key === 'total' ? 0.9 : 0.95}
          />
        ))}

        {xLabelIndexes.map((index) => (
          <text
            key={series[index]?.date ?? index}
            x={xAt(index)}
            y={CHART_HEIGHT - 12}
            textAnchor="middle"
            fill="currentColor"
          >
            {formatAxisDate(series[index].date)}
          </text>
        ))}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {SERIES.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-semibold text-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminCrawlCollectionStatsClient() {
  const [days, setDays] = useState<number>(30);
  const [series, setSeries] = useState<DailyCrawlCollectionStatPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/crawl-collection-stats?days=${days}`, { cache: 'no-store' });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { series: DailyCrawlCollectionStatPoint[] };
          error?: { message?: string };
        };
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.error?.message ?? '수집 데이터 통계를 불러오지 못했습니다.');
        }
        setSeries(json.data.series);
      } catch (err) {
        setError(err instanceof Error ? err.message : '수집 데이터 통계를 불러오지 못했습니다.');
        setSeries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  const hasAnyData = series.some((point) => point.total > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="수집 데이터 통계"
        description="수집 실행 내역의 소스별 신규·갱신(upsert) 건수를 한국 시간 기준 일별로 합산합니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}

      <Card
        title="일별 수집 채용 공고"
        description="대기업·계열사, 중견기업, IT 기업 구분과 전체 추이입니다. 같은 실행에서 여러 구분에 겹치는 소스는 각각에 포함됩니다."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {DAY_OPTIONS.map((option) => {
            const active = days === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:bg-neutral-100 hover:text-foreground',
                )}
              >
                최근 {option}일
              </button>
            );
          })}
        </div>

        {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}
        {!loading && !hasAnyData ? (
          <p className="text-sm text-muted">선택한 기간에 수집 실행 데이터가 없습니다.</p>
        ) : null}
        {!loading && hasAnyData ? <DailyCollectionChart series={series} /> : null}
      </Card>
    </div>
  );
}

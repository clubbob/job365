'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import {
  adminJson,
  adminPrimaryActionClassName,
  humanizeAdminFetchError,
} from '@/lib/admin-ui';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';
import { formatInquiryDateTime } from '@/lib/inquiry-display';
import { emptyCompanySegmentCounts } from '@/lib/job-board/company-segment';
import {
  ADMIN_CRAWL_STATS_SEGMENTS,
  jobBoardToAdminCrawlStatsCounts,
  LAST_ADMIN_CRAWL_STATS_SEGMENT,
  netAdminCrawlStatsCounts,
  registryToAdminCrawlStatsCounts,
  sumAdminCrawlStatsSegmentCounts,
  type AdminCrawlStatsSegment,
} from '@/lib/recruiting-employers/admin-crawl-stats-columns';
import type { RecruitingRegistrySegmentCounts } from '@/lib/recruiting-employers/registry-count-format';
import { cn } from '@/lib/utils';

type CrawlStatsSummary = {
  companyCount: number;
  companyRegistryBySegment?: RecruitingRegistrySegmentCounts;
  fetched: number;
  fetchedBySegment?: Record<string, number>;
  closed: number;
  closedBySegment?: Record<string, number>;
  activeJobs: number;
  activeJobsBySegment?: Record<string, number>;
  storedActiveJobs: number;
  storedActiveJobsBySegment: Record<string, number>;
  lastRun: {
    finishedAt: string;
    runKind: 'daily' | 'mid-sized-only';
    sourceCount: number;
    errorSourceCount: number;
  } | null;
};

type RunResponse =
  | { ok: true; data: { summary: { totalUpserted: number; totalClosed: number } } }
  | { ok: false; error?: { message?: string } };

function formatCrawlEtaLabel(seconds: number): string {
  if (seconds <= 0) return '곧 끝납니다';
  if (seconds < 60) return '1분 이내';
  const minutes = Math.ceil(seconds / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `약 ${hours}시간 ${rest}분` : `약 ${hours}시간`;
  }
  return `약 ${minutes}분`;
}

function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

const STATS_TABLE_CLASS =
  'w-full table-fixed border-collapse text-sm [&_th]:font-semibold [&_th]:text-subtle [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5 [&_th]:align-middle [&_td]:align-middle';

const STATS_LABEL_CELL = 'whitespace-nowrap border-r border-border text-left';
const STATS_NUM_CELL = 'text-right tabular-nums whitespace-nowrap';
/** IT·합계 열 경계 — 양쪽 동일 여백(1.5rem)으로 구분선이 숫자 사이 중앙에 오도록 */
const STATS_LAST_SEGMENT_CELL = `${STATS_NUM_CELL} !pr-6`;
const STATS_TOTAL_CELL = `${STATS_NUM_CELL} border-l border-border bg-neutral-50/80 !pl-6 font-semibold text-foreground`;

function statsSegmentCellClass(segment: AdminCrawlStatsSegment): string {
  return segment === LAST_ADMIN_CRAWL_STATS_SEGMENT ? STATS_LAST_SEGMENT_CELL : STATS_NUM_CELL;
}

type StatsRowView = StatsRow & {
  groupRowSpan: number;
  showGroupCell: boolean;
};

function withGroupRowSpans(rows: StatsRow[]): StatsRowView[] {
  return rows.map((row, index) => {
    const prev = rows[index - 1];
    const showGroupCell = index === 0 || prev.group !== row.group;
    let groupRowSpan = 1;
    if (showGroupCell) {
      while (index + groupRowSpan < rows.length && rows[index + groupRowSpan].group === row.group) {
        groupRowSpan += 1;
      }
    }
    return { ...row, groupRowSpan, showGroupCell };
  });
}

function formatSignedCount(value: number, unit: '건' | '곳'): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCount(value)}${unit}`;
}

function formatAmount(
  value: number,
  unit: '건' | '곳',
  options?: { signed?: boolean; negative?: boolean },
): string {
  const signed = options?.signed ?? false;
  const negative = options?.negative ?? false;
  if (negative && value > 0) return `-${formatCount(value)}${unit}`;
  return signed ? formatSignedCount(value, unit) : `${formatCount(value)}${unit}`;
}

type StatsRow = {
  group: string;
  label: string;
  values: Record<AdminCrawlStatsSegment, number> | null;
  total: number | null;
  unit: '건' | '곳';
  signed?: boolean;
  /** 마감 등 차감 의미 — 양수를 −504건 형태로 표시 */
  negative?: boolean;
};

function buildStatsRows(summary: CrawlStatsSummary): StatsRow[] {
  const registry = summary.companyRegistryBySegment ?? {
    enterprise: 0,
    'mid-sized': 0,
    it: 0,
    'semi-equipment': 0,
  };
  const registryValues = registryToAdminCrawlStatsCounts(registry);

  const storedValues = jobBoardToAdminCrawlStatsCounts(
    summary.storedActiveJobsBySegment ?? emptyCompanySegmentCounts(),
  );
  const activeValues = jobBoardToAdminCrawlStatsCounts(
    summary.activeJobsBySegment ?? emptyCompanySegmentCounts(),
  );

  const rows: StatsRow[] = [
    {
      group: '명단',
      label: '수집 채용 회사',
      total: sumAdminCrawlStatsSegmentCounts(registryValues),
      values: registryValues,
      unit: '곳',
    },
    {
      group: '지금',
      label: '수집 채용 공고',
      total: sumAdminCrawlStatsSegmentCounts(storedValues),
      values: storedValues,
      unit: '건',
    },
    {
      group: '지금',
      label: '노출 채용 공고',
      total: sumAdminCrawlStatsSegmentCounts(activeValues),
      values: activeValues,
      unit: '건',
    },
  ];

  if (!summary.lastRun) return rows;

  const fetchedRaw = summary.fetchedBySegment ?? emptyCompanySegmentCounts();
  const closedRaw = summary.closedBySegment ?? emptyCompanySegmentCounts();
  const fetched = jobBoardToAdminCrawlStatsCounts(fetchedRaw);
  const closed = jobBoardToAdminCrawlStatsCounts(closedRaw);
  const netValues = netAdminCrawlStatsCounts(fetchedRaw, closedRaw);

  rows.push(
    {
      group: '마지막 수집',
      label: '추가된 공고',
      total: sumAdminCrawlStatsSegmentCounts(fetched),
      values: fetched,
      unit: '건',
    },
    {
      group: '마지막 수집',
      label: '마감 처리 공고',
      total: sumAdminCrawlStatsSegmentCounts(closed),
      values: closed,
      unit: '건',
      negative: true,
    },
    {
      group: '마지막 수집',
      label: '순 증감 공고',
      total: sumAdminCrawlStatsSegmentCounts(netValues),
      values: netValues,
      unit: '건',
      signed: true,
    },
  );

  return rows;
}

export default function AdminCrawlRunsClient() {
  const [summary, setSummary] = useState<CrawlStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');
  const [crawlEtaSeconds, setCrawlEtaSeconds] = useState(0);
  const crawlEtaInitialSeconds = CRAWL_SCHEDULE.localManualRunEstimateMinutes * 60;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await adminJson<{ ok?: boolean; data?: CrawlStatsSummary }>(
        '/api/admin/crawl-stats-summary',
      );
      if (!json.ok || !json.data) throw new Error('수집 통계를 불러오지 못했습니다.');
      setSummary(json.data);
    } catch (err) {
      setError(
        humanizeAdminFetchError(err instanceof Error ? err.message : '수집 통계를 불러오지 못했습니다.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!running) {
      setCrawlEtaSeconds(0);
      return;
    }
    setCrawlEtaSeconds(crawlEtaInitialSeconds);
    const tick = window.setInterval(() => {
      setCrawlEtaSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [running, crawlEtaInitialSeconds]);

  const crawlEtaProgress =
    crawlEtaInitialSeconds > 0
      ? Math.min(100, ((crawlEtaInitialSeconds - crawlEtaSeconds) / crawlEtaInitialSeconds) * 100)
      : 0;

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
        `수집 완료 — 저장 ${json.data.summary.totalUpserted.toLocaleString('ko-KR')}건 · 마감 ${json.data.summary.totalClosed.toLocaleString('ko-KR')}건`,
      );
      await load();
    } catch (err) {
      const base = humanizeAdminFetchError(
        err instanceof Error ? err.message : '수집을 실행하지 못했습니다.',
      );
      const timedOutHint =
        base.includes('서버에 연결하지 못했습니다')
          ? ' 브라우저 요청은 약 5분에서 끊길 수 있지만, 중견 배치는 회사마다 DB에 저장하므로 이미 쌓인 공고는 「수집 채용 공고」에서 확인해 보세요. 로컬에서 끝까지 돌리려면 터미널에서 pnpm crawl 을 사용하세요.'
          : '';
      setError(`${base}${timedOutHint}`);
    } finally {
      setRunning(false);
    }
  }

  const lastRunLabel = summary?.lastRun
    ? `마지막 수집 ${formatInquiryDateTime(summary.lastRun.finishedAt)}`
    : summary
      ? '아직 수집 기록이 없습니다.'
      : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="통계 요약"
        description="기업 카테고리별 통계 요약한 페이지입니다."
        homeHref="/admin"
        homeLabel="대시보드"
        trailing={
          <button
            type="button"
            onClick={() => void handleRunNow()}
            disabled={running}
            className={cn(adminPrimaryActionClassName, 'shrink-0')}
          >
            {running ? '수집 중…' : '지금 수집 실행'}
          </button>
        }
      />

      {running ? (
        <Card>
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              예상 남은 시간 {formatCrawlEtaLabel(crawlEtaSeconds)}
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200/90"
              role="progressbar"
              aria-valuenow={Math.round(crawlEtaProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="수집 진행(예상)"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                style={{ width: `${crawlEtaProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              처음 {CRAWL_SCHEDULE.localManualRunEstimateMinutes}분 기준으로 줄어 듭니다. 실제로는 더 길거나 짧을 수
              있어요. 이 탭을 닫지 마세요.
            </p>
          </div>
        </Card>
      ) : null}

      {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}
      {runMessage ? <FormFeedback variant="success">{runMessage}</FormFeedback> : null}

      <Card description={loading ? '불러오는 중…' : lastRunLabel}>
        {loading && !summary ? <p className="text-sm text-muted">불러오는 중…</p> : null}
        {summary ? (
          <div className="overflow-x-auto">
            <table className={STATS_TABLE_CLASS}>
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border">
                  <th className="whitespace-nowrap text-left">구분</th>
                  <th className={STATS_LABEL_CELL}>항목</th>
                  {ADMIN_CRAWL_STATS_SEGMENTS.map((segment) => (
                    <th key={segment} className={`${statsSegmentCellClass(segment)} text-subtle`}>
                      {segment}
                    </th>
                  ))}
                  <th className={STATS_TOTAL_CELL}>합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {withGroupRowSpans(buildStatsRows(summary)).map((row) => {
                  const total =
                    row.total === null || row.values === null ? null : row.total;
                  return (
                    <tr key={`${row.group}-${row.label}`}>
                      {row.showGroupCell ? (
                        <td
                          rowSpan={row.groupRowSpan}
                          className="border-r border-border/60 bg-neutral-50/40 font-medium text-muted align-middle"
                        >
                          {row.group}
                        </td>
                      ) : null}
                      <td className={STATS_LABEL_CELL}>{row.label}</td>
                      {ADMIN_CRAWL_STATS_SEGMENTS.map((segment) => (
                        <td key={segment} className={statsSegmentCellClass(segment)}>
                          {row.values === null
                            ? '—'
                            : formatAmount(row.values[segment], row.unit, {
                                signed: row.signed,
                                negative: row.negative,
                              })}
                        </td>
                      ))}
                      <td className={STATS_TOTAL_CELL}>
                        {total === null
                          ? '—'
                          : formatAmount(total, row.unit, {
                              signed: row.signed,
                              negative: row.negative,
                            })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

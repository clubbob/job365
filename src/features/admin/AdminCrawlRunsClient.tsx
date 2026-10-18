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
import { cn } from '@/lib/utils';

type CrawlStatsSummary = {
  companyCount: number;
  fetched: number;
  saved: number;
  closed: number;
  activeJobs: number;
  storedActiveJobs: number;
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
  'w-full min-w-[36rem] text-left text-sm [&_th]:font-semibold [&_th]:text-subtle [&_td]:align-top [&_td]:py-2.5 [&_th]:py-2';

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
    ? (() => {
        const kind = summary.lastRun!.runKind === 'mid-sized-only' ? '중견만' : '전체 수집';
        const at = formatInquiryDateTime(summary.lastRun!.finishedAt);
        const errors =
          summary.lastRun!.errorSourceCount > 0
            ? ` · 오류 소스 ${formatCount(summary.lastRun!.errorSourceCount)}곳`
            : '';
        return `마지막 수집 ${at} (${kind}, 소스 ${formatCount(summary.lastRun!.sourceCount)}곳)${errors}`;
      })()
    : '아직 수집 기록이 없습니다.';

  return (
    <div className="space-y-5">
      <PageHeader
        title="수집 통계 요약"
        description="수집 대상 규모와 마지막 수집 결과, 현재 모집 중 공고를 한눈에 봅니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">수집 일정</p>
            <p className="mt-1 text-sm text-muted">{CRAWL_SCHEDULE.label}</p>
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer font-semibold text-subtle hover:text-foreground">
                자동·로컬 수집 안내
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
                <li>{CRAWL_SCHEDULE.detail}</li>
                <li>
                  자동 수집은 {CRAWL_SCHEDULE.runner}에서 {CRAWL_SCHEDULE.label}에 실행됩니다(한 번 최대{' '}
                  {CRAWL_SCHEDULE.maxRunnerMinutes}분). 개발 PC에서는 예약 실행이 없습니다.
                </li>
              </ul>
            </details>
          </div>
          <button
            type="button"
            onClick={() => void handleRunNow()}
            disabled={running}
            className={cn(adminPrimaryActionClassName, 'shrink-0')}
          >
            {running ? '수집 중…' : '지금 수집 실행'}
          </button>
        </div>
        {running ? (
          <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
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
        ) : null}
      </Card>

      {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}
      {runMessage ? <FormFeedback variant="success">{runMessage}</FormFeedback> : null}

      <Card title="통계 요약" description={loading ? '불러오는 중…' : lastRunLabel}>
        {loading && !summary ? <p className="text-sm text-muted">불러오는 중…</p> : null}
        {summary ? (
          <div className="overflow-x-auto">
            <table className={STATS_TABLE_CLASS}>
              <thead>
                <tr className="border-b border-border">
                  <th className="w-[5.5rem] pr-3 whitespace-nowrap">구분</th>
                  <th className="pr-3 whitespace-nowrap">항목</th>
                  <th className="w-[6.5rem] pr-3 whitespace-nowrap text-right">값</th>
                  <th className="min-w-[12rem] text-muted">설명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                <tr>
                  <td className="pr-3 font-medium text-muted">지금</td>
                  <td className="pr-3">채용 정보 노출</td>
                  <td className="pr-3 text-right font-semibold tabular-nums">
                    {formatCount(summary.activeJobs)}건
                  </td>
                  <td className="text-xs text-muted">
                    구직자 채용 정보·대시보드와 동일(노출 로직·중복 제거 후). 마지막 수집 합과는 무관합니다.
                  </td>
                </tr>
                <tr>
                  <td className="pr-3 font-medium text-muted">지금</td>
                  <td className="pr-3">수집 모집 중</td>
                  <td className="pr-3 text-right font-semibold tabular-nums">
                    {formatCount(summary.storedActiveJobs)}건
                  </td>
                  <td className="text-xs text-muted">
                    DB에 모집 중으로 남아 있는 수집 공고 전체. 「수집 채용 공고」 기본 목록 건수와 같습니다.
                  </td>
                </tr>
                <tr>
                  <td className="pr-3 font-medium text-muted">명단</td>
                  <td className="pr-3">수집 대상 회사</td>
                  <td className="pr-3 text-right font-semibold tabular-nums">
                    {formatCount(summary.companyCount)}곳
                  </td>
                  <td className="text-xs text-muted">대기업·계열, 중견, 기타 명단(수집마다 변하지 않음)</td>
                </tr>
                <tr>
                  <td className="pr-3 font-medium text-muted">마지막 수집</td>
                  <td className="pr-3">가져온 공고</td>
                  <td className="pr-3 text-right font-semibold tabular-nums">
                    {summary.lastRun ? `${formatCount(summary.fetched)}건` : '—'}
                  </td>
                  <td className="text-xs text-muted">채용 페이지에서 읽어 온 수</td>
                </tr>
                <tr>
                  <td className="pr-3 font-medium text-muted">마지막 수집</td>
                  <td className="pr-3">저장·갱신</td>
                  <td className="pr-3 text-right font-semibold tabular-nums text-primary">
                    {summary.lastRun ? `${formatCount(summary.saved)}건` : '—'}
                  </td>
                  <td className="text-xs text-muted">신규 등록 또는 내용이 바뀐 공고</td>
                </tr>
                <tr>
                  <td className="pr-3 font-medium text-muted">마지막 수집</td>
                  <td className="pr-3">마감 처리</td>
                  <td className="pr-3 text-right font-semibold tabular-nums">
                    {summary.lastRun ? `${formatCount(summary.closed)}건` : '—'}
                  </td>
                  <td className="text-xs text-muted">그 수집에서 사라졌거나 마감일이 지난 공고</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

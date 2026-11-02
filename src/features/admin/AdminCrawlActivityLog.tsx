'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import {
  adminJson,
  humanizeAdminFetchError,
} from '@/lib/admin-ui';
import type {
  AdminCrawlActivityLogPayload,
  AdminCrawlDailyLogRow,
  AdminCrawlRunLogRow,
} from '@/lib/admin-crawl-activity-log';
import { ADMIN_JOBS_REFRESH_EVENT } from '@/lib/admin-jobs-refresh';
import { formatInquiryDateTime } from '@/lib/inquiry-display';
import { cn } from '@/lib/utils';

const LOG_TABLE_CLASS =
  'w-full border-collapse text-sm [&_th]:font-semibold [&_th]:text-subtle [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5 [&_th]:align-middle [&_td]:align-middle';

const NUM_CELL = 'text-right tabular-nums whitespace-nowrap';
const NOTE_CELL = 'min-w-[10rem] text-left text-muted whitespace-normal break-words [overflow-wrap:anywhere] align-top';

function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

function formatSignedCount(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCount(value)}건`;
}

type ActivityResponse =
  | { ok: true; data: AdminCrawlActivityLogPayload }
  | { ok: false; error?: { message?: string } };

type AdminCrawlActivityLogProps = {
  /** 상단 통계를 다시 불러온 뒤 로그도 맞출 때 */
  reloadKey?: string | number;
};

export default function AdminCrawlActivityLog({ reloadKey }: AdminCrawlActivityLogProps) {
  const [payload, setPayload] = useState<AdminCrawlActivityLogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await adminJson<ActivityResponse>('/api/admin/crawl-activity-log');
      if (!json.ok || !json.data) {
        throw new Error(json.ok ? undefined : json.error?.message);
      }
      setPayload(json.data);
    } catch (err) {
      setError(
        humanizeAdminFetchError(
          err instanceof Error ? err.message : '수집·노출 내역을 불러오지 못했습니다.',
        ),
      );
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener(ADMIN_JOBS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(ADMIN_JOBS_REFRESH_EVENT, onRefresh);
  }, [load]);

  const retentionNote = payload
    ? `수집 실행 기록은 ${payload.retentionDays}일이 지나면 자동으로 정리됩니다. 일별 스냅샷은 그날 처음 기록한 통계입니다.`
    : undefined;

  return (
    <div className="space-y-5">
      {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}

      <Card
        title="수집 실행 내역"
        description={
          loading && !payload
            ? '불러오는 중…'
            : '추출(수집)이 끝난 시각마다 저장·마감·오류를 남깁니다. 중단·실패 추적에 쓰세요.'
        }
      >
        {loading && !payload ? <p className="text-sm text-muted">불러오는 중…</p> : null}
        {payload && payload.runs.length === 0 ? (
          <p className="text-sm text-muted">아직 수집 실행 기록이 없습니다.</p>
        ) : null}
        {payload && payload.runs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={LOG_TABLE_CLASS}>
              <thead>
                <tr className="border-b border-border">
                  <th className="whitespace-nowrap text-left">완료</th>
                  <th className={NUM_CELL}>추출</th>
                  <th className={NUM_CELL}>저장</th>
                  <th className={NUM_CELL}>마감</th>
                  <th className={NUM_CELL}>순 증감</th>
                  <th className={NUM_CELL}>오류 소스</th>
                  <th className="text-left">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {payload.runs.map((row) => (
                  <RunLogRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card
        title="일별 노출 스냅샷"
        description="날짜별로 한 번 남긴 노출·수집 건수입니다. 수집 전후 변화를 비교할 때 참고하세요."
      >
        {loading && !payload ? <p className="text-sm text-muted">불러오는 중…</p> : null}
        {payload && payload.daily.length === 0 ? (
          <p className="text-sm text-muted">일별 스냅샷이 아직 없습니다. 수집·통계 요약이 돌면 쌓입니다.</p>
        ) : null}
        {payload && payload.daily.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={LOG_TABLE_CLASS}>
              <thead>
                <tr className="border-b border-border">
                  <th className="whitespace-nowrap text-left">날짜</th>
                  <th className="whitespace-nowrap text-left">기록 시각</th>
                  <th className="whitespace-nowrap text-left">기록 시점</th>
                  <th className={cn(NUM_CELL, 'font-semibold text-primary')}>노출 공고</th>
                  <th className={NUM_CELL}>수집 공고</th>
                  <th className={NUM_CELL}>부적합</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {payload.daily.map((row) => (
                  <DailyLogRow key={`${row.day}-${row.capturedAt}`} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {retentionNote ? <p className="mt-3 text-xs text-muted">{retentionNote}</p> : null}
      </Card>
    </div>
  );
}

function RunLogRow({ row }: { row: AdminCrawlRunLogRow }) {
  const hasError = row.errorSourceCount > 0;
  return (
    <tr className={hasError ? 'bg-amber-50/60' : undefined}>
      <td className="whitespace-nowrap align-top">{formatInquiryDateTime(row.finishedAt)}</td>
      <td className={cn(NUM_CELL, 'align-top')}>
        {row.fetchedTotal > 0 ? `${formatCount(row.fetchedTotal)}건` : '—'}
      </td>
      <td className={cn(NUM_CELL, 'align-top')}>{formatCount(row.totalUpserted)}건</td>
      <td className={cn(NUM_CELL, 'align-top')}>{formatCount(row.totalClosed)}건</td>
      <td className={cn(NUM_CELL, 'align-top')}>{formatSignedCount(row.netChange)}</td>
      <td className={cn(NUM_CELL, 'align-top')}>{hasError ? `${formatCount(row.errorSourceCount)}곳` : '—'}</td>
      <td className={NOTE_CELL}>{row.statusNote}</td>
    </tr>
  );
}

function DailyLogRow({ row }: { row: AdminCrawlDailyLogRow }) {
  return (
    <tr>
      <td className="whitespace-nowrap tabular-nums">{row.day}</td>
      <td className="whitespace-nowrap">{formatInquiryDateTime(row.capturedAt)}</td>
      <td className="whitespace-nowrap">{row.capturedBeforeLabel}</td>
      <td className={cn(NUM_CELL, 'font-semibold text-primary')}>{formatCount(row.activeJobs)}건</td>
      <td className={NUM_CELL}>{formatCount(row.storedActiveJobs)}건</td>
      <td className={NUM_CELL}>{formatCount(row.unsuitableJobs)}건</td>
    </tr>
  );
}

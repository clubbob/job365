'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { FormFeedback } from '@/components/ui/FormFeedback';
import RecruitingEmployerBrowser from '@/features/admin/RecruitingEmployerBrowser';
import { cn } from '@/lib/utils';

type CompaniesSegment = 'enterprise' | 'mid-sized' | 'misc' | 'it';

const SEGMENT_TABS: Array<{ id: CompaniesSegment; label: string }> = [
  { id: 'enterprise', label: '대기업·계열사' },
  { id: 'mid-sized', label: '중견기업' },
  { id: 'misc', label: '기타기업' },
  { id: 'it', label: 'IT 기업' },
];

export default function JobCompaniesPanel({
  error,
  loading = false,
}: {
  error?: string | null;
  loading?: boolean;
} = {}) {
  const [segment, setSegment] = useState<CompaniesSegment>('enterprise');
  const [segmentCounts, setSegmentCounts] = useState<
    Record<CompaniesSegment, number | null>
  >({
    enterprise: null,
    'mid-sized': null,
    misc: null,
    it: null,
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/recruiting-companies?registryCounts=1', { cache: 'no-store' });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { registryCounts?: Record<CompaniesSegment, number> };
        };
        if (!res.ok || !json.ok || !json.data?.registryCounts) return;
        setSegmentCounts({
          enterprise: json.data.registryCounts.enterprise ?? null,
          'mid-sized': json.data.registryCounts['mid-sized'] ?? null,
          misc: json.data.registryCounts.misc ?? null,
          it: json.data.registryCounts.it ?? null,
        });
      } catch {
        // 탭 숫자는 목록 로드 후에도 갱신됩니다.
      }
    })();
  }, []);

  const handleListMeta = useCallback(
    (meta: { segment: CompaniesSegment; registryCount: number }) => {
      if (typeof meta.registryCount !== 'number' || !Number.isFinite(meta.registryCount)) return;
      setSegmentCounts((prev) => ({ ...prev, [meta.segment]: meta.registryCount }));
    },
    [],
  );

  return (
    <div className={cn('space-y-5', loading && 'opacity-70')}>
      <PageHeader
        title="수집 채용 회사"
        description="수집 채용 회사별 활성 공고 건수를 조회합니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}

      <div
        className="flex gap-1 rounded-xl border border-border bg-surface p-1"
        role="tablist"
        aria-label="수집 채용 회사 구분"
      >
        {SEGMENT_TABS.map((item) => {
          const active = segment === item.id;
          const count = segmentCounts[item.id];
          const countLabel =
            typeof count === 'number' ? `${count.toLocaleString('ko-KR')}곳` : '—';
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSegment(item.id)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:flex-row sm:justify-center sm:gap-2',
                active ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-neutral-100 hover:text-foreground',
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  active ? 'text-white/90' : 'text-subtle',
                )}
              >
                {countLabel}
              </span>
            </button>
          );
        })}
      </div>

      {segment === 'enterprise' ? (
        <div className="space-y-4" role="tabpanel">
          <RecruitingEmployerBrowser segment="enterprise" onListMeta={handleListMeta} />
        </div>
      ) : null}

      {segment === 'mid-sized' ? (
        <div className="space-y-4" role="tabpanel">
          <RecruitingEmployerBrowser segment="mid-sized" onListMeta={handleListMeta} />
        </div>
      ) : null}

      {segment === 'misc' ? (
        <div className="space-y-4" role="tabpanel">
          <RecruitingEmployerBrowser segment="misc" onListMeta={handleListMeta} />
        </div>
      ) : null}

      {segment === 'it' ? (
        <div className="space-y-4" role="tabpanel">
          <RecruitingEmployerBrowser segment="it" onListMeta={handleListMeta} />
        </div>
      ) : null}
    </div>
  );
}

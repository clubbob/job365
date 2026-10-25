'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { FormFeedback } from '@/components/ui/FormFeedback';
import RecruitingEmployerBrowser from '@/features/admin/RecruitingEmployerBrowser';
import RecruitingCompanySegmentTabBar from '@/features/admin/RecruitingCompanySegmentTabBar';
import {
  emptyRecruitingCompanySegmentTabCounts,
  type RecruitingCompanySegmentId,
} from '@/lib/recruiting-employers/company-segment-tabs';
import { cn } from '@/lib/utils';

export default function JobCompaniesPanel({
  error,
  loading = false,
}: {
  error?: string | null;
  loading?: boolean;
} = {}) {
  const [segment, setSegment] = useState<RecruitingCompanySegmentId>('enterprise');
  const [segmentCounts, setSegmentCounts] = useState(emptyRecruitingCompanySegmentTabCounts());

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/recruiting-companies?registryCounts=1', { cache: 'no-store' });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { registryCounts?: Record<RecruitingCompanySegmentId, number> };
        };
        if (!res.ok || !json.ok || !json.data?.registryCounts) return;
        setSegmentCounts({
          enterprise: json.data.registryCounts.enterprise ?? null,
          'mid-sized': json.data.registryCounts['mid-sized'] ?? null,
          it: json.data.registryCounts.it ?? null,
          'semi-equipment': json.data.registryCounts['semi-equipment'] ?? null,
        });
      } catch {
        // 탭 숫자는 목록 로드 후에도 갱신됩니다.
      }
    })();
  }, []);

  const handleListMeta = useCallback(
    (meta: { segment: RecruitingCompanySegmentId; registryCount: number }) => {
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

      <RecruitingCompanySegmentTabBar
        active={segment}
        onChange={setSegment}
        counts={segmentCounts}
        countUnit="곳"
        ariaLabel="수집 채용 회사 구분"
      />

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

      {segment === 'it' ? (
        <div className="space-y-4" role="tabpanel">
          <RecruitingEmployerBrowser segment="it" onListMeta={handleListMeta} />
        </div>
      ) : null}

      {segment === 'semi-equipment' ? (
        <div className="space-y-4" role="tabpanel">
          <RecruitingEmployerBrowser segment="semi-equipment" onListMeta={handleListMeta} />
        </div>
      ) : null}
    </div>
  );
}

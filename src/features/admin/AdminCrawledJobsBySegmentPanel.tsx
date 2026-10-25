'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import AdminCrawledJobsClient, {
  type AdminCrawledJobsListMode,
} from '@/features/admin/AdminCrawledJobsClient';
import RecruitingCompanySegmentTabBar from '@/features/admin/RecruitingCompanySegmentTabBar';
import { adminJson } from '@/lib/admin-ui';
import { emptyCompanySegmentCounts, type JobBoardCompanySegment } from '@/lib/job-board/company-segment';
import {
  emptyRecruitingCompanySegmentTabCounts,
  mergeJobBoardSegmentCounts,
  recruitingCompanySegmentJobBoardSegment,
  segmentTabCountsFromJobBoard,
  type RecruitingCompanySegmentId,
} from '@/lib/recruiting-employers/company-segment-tabs';

type CrawlStatsSegments = {
  storedActiveJobsBySegment?: Record<JobBoardCompanySegment, number>;
  activeJobsBySegment?: Record<JobBoardCompanySegment, number>;
};

export default function AdminCrawledJobsBySegmentPanel({
  listMode,
}: {
  listMode: AdminCrawledJobsListMode;
}) {
  const browsableOnly = listMode === 'browsable';
  const [segment, setSegment] = useState<RecruitingCompanySegmentId>('enterprise');
  const [segmentCounts, setSegmentCounts] = useState(emptyRecruitingCompanySegmentTabCounts());

  useEffect(() => {
    void (async () => {
      try {
        const json = await adminJson<{ ok?: boolean; data?: CrawlStatsSegments }>(
          '/api/admin/crawl-stats-summary',
        );
        if (!json.ok || !json.data) return;
        const boardCounts = mergeJobBoardSegmentCounts(
          browsableOnly
            ? (json.data.activeJobsBySegment ?? {})
            : (json.data.storedActiveJobsBySegment ?? emptyCompanySegmentCounts()),
        );
        const mapped = segmentTabCountsFromJobBoard(boardCounts);
        setSegmentCounts({
          enterprise: mapped.enterprise,
          'mid-sized': mapped['mid-sized'],
          it: mapped.it,
          'semi-equipment': mapped['semi-equipment'],
        });
      } catch {
        // 탭 건수는 목록 API 응답으로도 갱신할 수 있습니다.
      }
    })();
  }, [browsableOnly]);

  const companySegment = recruitingCompanySegmentJobBoardSegment(segment);

  return (
    <div className="space-y-5">
      <PageHeader
        title={browsableOnly ? '노출 채용 공고' : '수집 채용 공고'}
        description={
          browsableOnly
            ? '구직자 채용 정보(/jobs)와 같은 노출·마감·중복 제거 기준 목록입니다. 회사 분류별로 나눠 봅니다.'
            : 'DB 모집 중 수집 공고입니다. 회사 분류별로 나눠 보고, 노출 여부는 필터로 구분할 수 있습니다.'
        }
        homeHref="/admin"
        homeLabel="대시보드"
      />

      <RecruitingCompanySegmentTabBar
        active={segment}
        onChange={setSegment}
        counts={segmentCounts}
        countUnit="건"
        ariaLabel={browsableOnly ? '노출 채용 공고 회사 분류' : '수집 채용 공고 회사 분류'}
      />

      <div role="tabpanel">
        <AdminCrawledJobsClient
          key={`${listMode}-${segment}`}
          listMode={listMode}
          companySegment={companySegment}
          embeddedInSegmentPanel
        />
      </div>
    </div>
  );
}

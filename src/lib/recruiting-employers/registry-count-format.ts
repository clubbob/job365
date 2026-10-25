import { JOB_BOARD_COMPANY_SEGMENTS } from '@/lib/job-board/company-segment';

/** 채용 회사 명단 분류별 곳 수(클라이언트·서버 공통, Node 의존 없음) */
export type RecruitingRegistrySegmentCounts = {
  enterprise: number;
  'mid-sized': number;
  it: number;
  'semi-equipment': number;
};

export function formatRecruitingRegistryCountBreakdown(
  counts: RecruitingRegistrySegmentCounts,
): string {
  const values = [
    counts.enterprise,
    counts['mid-sized'],
    counts.it,
    counts['semi-equipment'],
  ];
  return JOB_BOARD_COMPANY_SEGMENTS.map(
    (segment, index) => `${segment} (${values[index]!.toLocaleString('ko-KR')}곳)`,
  ).join(', ');
}

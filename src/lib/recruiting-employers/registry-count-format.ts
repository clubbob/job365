/** 채용 회사 명단 분류별 곳 수(클라이언트·서버 공통, Node 의존 없음) */
export type RecruitingRegistrySegmentCounts = {
  enterprise: number;
  'mid-sized': number;
  it: number;
};

export function formatRecruitingRegistryCountBreakdown(
  counts: RecruitingRegistrySegmentCounts,
): string {
  return [
    `대기업·계열사 (${counts.enterprise.toLocaleString('ko-KR')}곳)`,
    `중견 기업 (${counts['mid-sized'].toLocaleString('ko-KR')}곳)`,
    `IT 회사 (${counts.it.toLocaleString('ko-KR')}곳)`,
  ].join(', ');
}

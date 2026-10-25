import {
  emptyCompanySegmentCounts,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';

export type RecruitingCompanySegmentId = 'enterprise' | 'mid-sized' | 'it' | 'semi-equipment';

export const RECRUITING_COMPANY_SEGMENT_TABS: ReadonlyArray<{
  id: RecruitingCompanySegmentId;
  label: string;
  jobBoardSegment: JobBoardCompanySegment;
}> = [
  { id: 'enterprise', label: '대기업', jobBoardSegment: '대기업' },
  { id: 'mid-sized', label: '중견기업', jobBoardSegment: '중견기업' },
  { id: 'it', label: 'IT 회사', jobBoardSegment: 'IT 회사' },
  {
    id: 'semi-equipment',
    label: '반도체·디스플레이 장비사',
    jobBoardSegment: '반도체·디스플레이 장비사',
  },
];

export function recruitingCompanySegmentJobBoardSegment(
  id: RecruitingCompanySegmentId,
): JobBoardCompanySegment {
  const tab = RECRUITING_COMPANY_SEGMENT_TABS.find((item) => item.id === id);
  return tab?.jobBoardSegment ?? '대기업';
}

export function segmentTabCountsFromJobBoard(
  counts: Record<JobBoardCompanySegment, number>,
): Record<RecruitingCompanySegmentId, number> {
  const out: Record<RecruitingCompanySegmentId, number> = {
    enterprise: 0,
    'mid-sized': 0,
    it: 0,
    'semi-equipment': 0,
  };
  for (const tab of RECRUITING_COMPANY_SEGMENT_TABS) {
    out[tab.id] = counts[tab.jobBoardSegment] ?? 0;
  }
  return out;
}

export function emptyRecruitingCompanySegmentTabCounts(): Record<
  RecruitingCompanySegmentId,
  number | null
> {
  return {
    enterprise: null,
    'mid-sized': null,
    it: null,
    'semi-equipment': null,
  };
}

export function mergeJobBoardSegmentCounts(
  partial: Partial<Record<JobBoardCompanySegment, number>>,
): Record<JobBoardCompanySegment, number> {
  const base = emptyCompanySegmentCounts();
  for (const key of Object.keys(base) as JobBoardCompanySegment[]) {
    if (typeof partial[key] === 'number') base[key] = partial[key]!;
  }
  return base;
}

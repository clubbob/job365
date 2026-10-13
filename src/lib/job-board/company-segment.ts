import { isItComputingCompanyName } from '@/lib/it-companies/catalog';
import type { CrawledJobListItem } from '@/types/crawled-job';

/** 채용 공고 목록 상세 필터 — 관리자 채용 공고 회사 탭과 같은 구분 */
export const JOB_BOARD_COMPANY_SEGMENTS = ['대기업·계열사', '중견기업', 'IT 기업'] as const;
export type JobBoardCompanySegment = (typeof JOB_BOARD_COMPANY_SEGMENTS)[number];

export function isJobBoardCompanySegment(value: string): value is JobBoardCompanySegment {
  return (JOB_BOARD_COMPANY_SEGMENTS as readonly string[]).includes(value);
}

export function parseJobBoardCompanySegments(value: unknown): JobBoardCompanySegment[] {
  if (!Array.isArray(value)) return [];
  const out: JobBoardCompanySegment[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !isJobBoardCompanySegment(item)) continue;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

export function companySegmentsForJob(
  job: Pick<CrawledJobListItem, 'companyName' | 'companySize'>,
): JobBoardCompanySegment[] {
  const segments: JobBoardCompanySegment[] = [];
  if (job.companySize === '대기업') {
    segments.push('대기업·계열사');
  }
  if (job.companySize === '중견기업') {
    segments.push('중견기업');
  }
  if (isItComputingCompanyName(job.companyName)) {
    segments.push('IT 기업');
  }
  return segments;
}

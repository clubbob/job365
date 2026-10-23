import {
  emptyCompanySegmentCounts,
  primaryCompanySegmentForJob,
  type CompanySegmentJobFields,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';
import type { CrawledJob } from '@/types/crawled-job';

export function countStoredActiveJobsByPrimaryCompanySegmentFromList(
  jobs: CrawledJob[],
): Record<JobBoardCompanySegment, number> {
  const counts = emptyCompanySegmentCounts();
  addJobsToPrimaryCompanySegmentCounts(counts, jobs);
  return counts;
}

export function addJobsToPrimaryCompanySegmentCounts(
  counts: Record<JobBoardCompanySegment, number>,
  jobs: Iterable<CompanySegmentJobFields>,
): void {
  for (const job of jobs) {
    counts[primaryCompanySegmentForJob(job)] += 1;
  }
}

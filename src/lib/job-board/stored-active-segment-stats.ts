import {
  emptyCompanySegmentCounts,
  isItCompanyJob,
  type CompanySegmentJobFields,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';
import { isItComputingCompany } from '@/lib/it-companies/catalog';
import { loadMidSizedRegistryDbCompanies } from '@/lib/mid-sized-companies/registry-db';
import type { CrawledJob } from '@/types/crawled-job';

let midSizedItCrawlSourceIds: Set<string> | null = null;

function getMidSizedItCrawlSourceIds(): Set<string> {
  if (!midSizedItCrawlSourceIds) {
    midSizedItCrawlSourceIds = new Set(
      loadMidSizedRegistryDbCompanies()
        .filter((record) => isItComputingCompany(record.companyName, record.industry))
        .map((record) => record.crawlSourceId.trim())
        .filter(Boolean),
    );
  }
  return midSizedItCrawlSourceIds;
}

function isItCompanyJobForAdminStats(job: CompanySegmentJobFields): boolean {
  if (isItCompanyJob(job)) return true;
  const sourceId = job.sourceId?.trim();
  if (!sourceId) return false;
  const key = sourceId.replace(/-careers$/i, '');
  return getMidSizedItCrawlSourceIds().has(key);
}

function primaryCompanySegmentForAdminStats(job: CompanySegmentJobFields): JobBoardCompanySegment {
  if (isItCompanyJobForAdminStats(job)) return 'IT 회사';
  if (job.companySize === '대기업') return '대기업·계열사';
  return '중견 기업';
}

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
    counts[primaryCompanySegmentForAdminStats(job)] += 1;
  }
}

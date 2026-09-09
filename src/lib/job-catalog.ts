import { listMyJobPostings } from '@/lib/my-job-posts';
import { SAMPLE_JOBS } from '@/lib/sample-jobs';
import type { JobPosting } from '@/types/job';

export function listJobs(): JobPosting[] {
  const mine = listMyJobPostings();
  const mineIds = new Set(mine.map((item) => item.id));
  const rest = SAMPLE_JOBS.filter((item) => !mineIds.has(item.id));
  return [...mine, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getJobById(id: string): JobPosting | undefined {
  return listJobs().find((item) => item.id === id);
}

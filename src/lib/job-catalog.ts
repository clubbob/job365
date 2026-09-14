import { attachJobCompany } from '@/lib/job-company';
import { findMyJobPosting, listMyJobPostings } from '@/lib/my-job-posts';
import { isPublishedJob, type JobPosting } from '@/types/job';

export function listJobs(): JobPosting[] {
  return listMyJobPostings()
    .filter(isPublishedJob)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getJobById(id: string): JobPosting | undefined {
  const owned = findMyJobPosting(id);
  if (owned && isPublishedJob(owned.job)) {
    return attachJobCompany(owned.job, owned.userId);
  }
  return undefined;
}

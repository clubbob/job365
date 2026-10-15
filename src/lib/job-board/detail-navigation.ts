export const CRAWLED_JOB_DETAIL_FROM_MY_JOBS = 'my-jobs';

export function crawledJobDetailHref(
  jobId: string,
  from?: typeof CRAWLED_JOB_DETAIL_FROM_MY_JOBS,
): string {
  const base = `/jobs/${encodeURIComponent(jobId)}`;
  if (from === CRAWLED_JOB_DETAIL_FROM_MY_JOBS) {
    return `${base}?from=${CRAWLED_JOB_DETAIL_FROM_MY_JOBS}`;
  }
  return base;
}

export function isCrawledJobDetailFromMyJobs(
  searchParams: Pick<URLSearchParams, 'get'> | null | undefined,
): boolean {
  return searchParams?.get('from') === CRAWLED_JOB_DETAIL_FROM_MY_JOBS;
}

export function crawledJobDetailListHref(
  searchParams: Pick<URLSearchParams, 'get'> | null | undefined,
): string {
  return isCrawledJobDetailFromMyJobs(searchParams) ? '/my-jobs' : '/jobs';
}

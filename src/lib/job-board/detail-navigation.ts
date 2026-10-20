export const CRAWLED_JOB_DETAIL_FROM_MY_JOBS = 'my-jobs';

export function crawledJobDetailHref(
  jobId: string,
  from?: typeof CRAWLED_JOB_DETAIL_FROM_MY_JOBS,
  listReturnQuery?: string,
): string {
  const base = `/jobs/${encodeURIComponent(jobId)}`;
  const params = new URLSearchParams();
  if (from === CRAWLED_JOB_DETAIL_FROM_MY_JOBS) {
    params.set('from', CRAWLED_JOB_DETAIL_FROM_MY_JOBS);
  }
  if (listReturnQuery?.trim()) {
    const extra = new URLSearchParams(listReturnQuery);
    extra.forEach((value, key) => {
      params.append(key, value);
    });
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function isCrawledJobDetailFromMyJobs(
  searchParams: Pick<URLSearchParams, 'get'> | null | undefined,
): boolean {
  return searchParams?.get('from') === CRAWLED_JOB_DETAIL_FROM_MY_JOBS;
}

export function crawledJobDetailListBasePath(
  searchParams: Pick<URLSearchParams, 'get'> | null | undefined,
): '/jobs' | '/my-jobs' {
  return isCrawledJobDetailFromMyJobs(searchParams) ? '/my-jobs' : '/jobs';
}

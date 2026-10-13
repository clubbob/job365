import type { CompanySize } from '@/lib/job-board/constants';

const DEFAULT_GENERIC_MAX = 150;
const DEFAULT_ENTERPRISE_MAX = 400;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(2_000, Math.floor(value));
}

export function maxJobsPerGenericSource(companySize?: CompanySize): number {
  if (companySize === '대기업') {
    return parsePositiveInt(process.env.CRAWL_ENTERPRISE_MAX_JOBS, DEFAULT_ENTERPRISE_MAX);
  }
  return parsePositiveInt(process.env.CRAWL_GENERIC_MAX_JOBS, DEFAULT_GENERIC_MAX);
}

import { isCompanyInfoComplete, isJobCompanyComplete, loadBizVerify } from '@/lib/biz-verify-store';
import { listPublishedMyJobPostings } from '@/lib/my-job-posts';

export const PROPOSE_REQUIREMENTS = ['회사 정보', '채용 정보'] as const;

export type ProposeRequirement = (typeof PROPOSE_REQUIREMENTS)[number];

export function missingProposeRequirements(userId: string): ProposeRequirement[] {
  const missing: ProposeRequirement[] = [];
  const published = listPublishedMyJobPostings(userId);
  const hasCompany =
    isCompanyInfoComplete(loadBizVerify(userId)) || published.some((job) => isJobCompanyComplete(job.company));
  if (!hasCompany) missing.push('회사 정보');
  if (published.length === 0) missing.push('채용 정보');
  return missing;
}

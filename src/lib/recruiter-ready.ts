import { isCompanyInfoComplete, loadBizVerify } from '@/lib/biz-verify-store';
import { listPublishedMyJobPostings } from '@/lib/my-job-posts';

export const PROPOSE_REQUIREMENTS = ['회사 정보', '채용 정보'] as const;

export type ProposeRequirement = (typeof PROPOSE_REQUIREMENTS)[number];

export function missingProposeRequirements(userId: string): ProposeRequirement[] {
  const missing: ProposeRequirement[] = [];
  if (!isCompanyInfoComplete(loadBizVerify(userId))) missing.push('회사 정보');
  if (listPublishedMyJobPostings(userId).length === 0) missing.push('채용 정보');
  return missing;
}

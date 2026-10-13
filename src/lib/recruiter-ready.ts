import { isCompanyInfoComplete, loadBizVerify } from '@/lib/biz-verify-store';

export const PROPOSE_REQUIREMENTS = ['회사 정보'] as const;

export type ProposeRequirement = (typeof PROPOSE_REQUIREMENTS)[number];

export function missingProposeRequirements(userId: string): ProposeRequirement[] {
  if (isCompanyInfoComplete(loadBizVerify(userId))) return [];
  return ['회사 정보'];
}

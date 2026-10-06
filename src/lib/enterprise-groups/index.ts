import { FTC_ENTERPRISE_GROUPS_2026 } from '@/lib/enterprise-groups/groups-data';
import type { FtcEnterpriseGroup, FtcEnterpriseScope } from '@/lib/enterprise-groups/types';

const GROUPS = FTC_ENTERPRISE_GROUPS_2026;

export function getFtcEnterpriseScope(): FtcEnterpriseScope {
  const affiliateCount = GROUPS.reduce((sum, group) => sum + group.affiliateCount, 0);

  return {
    designationYear: 2026,
    groupCount: GROUPS.length,
    affiliateCount,
    crossInvestmentRestrictedGroupCount: 47,
    crossInvestmentRestrictedAffiliateCount: 2088,
    sourceNote: '공정거래위원회 2026년 공시대상기업집단 지정 결과',
    groups: GROUPS,
  };
}

export function getFtcEnterpriseGroups(): FtcEnterpriseGroup[] {
  return GROUPS;
}

export function getFtcGroupByCrawlSourceId(crawlSourceId: string): FtcEnterpriseGroup | undefined {
  return GROUPS.find((group) => group.crawlSourceId === crawlSourceId);
}

export function getFtcGroupByName(name: string): FtcEnterpriseGroup | undefined {
  const normalized = name.trim();
  return GROUPS.find((group) => group.name === normalized);
}

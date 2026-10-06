import { getCrawlerCompanies, type CrawlerCompany } from '@/lib/crawler/companies';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';
import { getFtcEnterpriseScope, getFtcGroupByCrawlSourceId } from '@/lib/enterprise-groups';

export type CrawlAdapterStatus = 'active' | 'pending';

export type DailyCrawlTarget = Omit<CrawlerCompany, 'ftcGroupName'> & {
  adapterStatus: CrawlAdapterStatus;
  ftcGroupName: string | null;
  ftcAffiliateCount: number | null;
};

export function getCrawlAdapterStatus(company: CrawlerCompany): CrawlAdapterStatus {
  if (company.adapter === 'greenhouse' && !company.greenhouseBoard) {
    return 'pending';
  }
  return 'active';
}

export function getDailyCrawlTargets(): DailyCrawlTarget[] {
  return getCrawlerCompanies().map((company) => {
    const group = getFtcGroupByCrawlSourceId(company.id);
    return {
      ...company,
      adapterStatus: getCrawlAdapterStatus(company),
      ftcGroupName: group?.name ?? company.ftcGroupName ?? null,
      ftcAffiliateCount: group?.affiliateCount ?? null,
    };
  });
}

export function getCrawlScheduleSummary() {
  const scope = getFtcEnterpriseScope();
  const targets = getDailyCrawlTargets();

  return {
    schedule: CRAWL_SCHEDULE,
    targetCount: targets.length,
    activeTargetCount: targets.filter((item) => item.adapterStatus === 'active').length,
    pendingTargetCount: targets.filter((item) => item.adapterStatus === 'pending').length,
    ftcScope: {
      designationYear: scope.designationYear,
      groupCount: scope.groupCount,
      affiliateCount: scope.affiliateCount,
      linkedGroupCount: targets.filter((item) => item.ftcGroupName).length,
    },
  };
}

import {
  companyPolicyDocId,
  listCrawlCompanyPolicies,
  type CrawlCompanyPolicy,
} from '@/lib/crawl-company-policy-server';
import { listCrawlSourcePolicies, type CrawlSourcePolicy } from '@/lib/crawl-source-policy-server';
import { getCrawlerCompanies, type CrawlerCompany } from '@/lib/crawler/companies';
import {
  buildEnterpriseGroupRows,
  summarizeEnterpriseGroupRows,
  type EnterpriseGroupRow,
} from '@/lib/crawler/enterprise-group-rows';
import { getCrawledJobSourceStats } from '@/lib/crawled-jobs-server';
import type { DiscoveredAffiliate } from '@/types/crawled-job';

export type JobCompanySourcePolicyView = {
  crawlDisabled: boolean;
  displayDisabled: boolean;
  reason: string | null;
  updatedAt: string | null;
};

export type JobCompanySourceView = {
  sourceId: string;
  sourceName: string;
  companyName: string;
  careersUrl: string;
  activeJobCount: number;
  discoveredAffiliates: DiscoveredAffiliate[];
  policy: JobCompanySourcePolicyView;
};

export type JobCompanyGroupView = EnterpriseGroupRow & {
  source: JobCompanySourceView | null;
};

export type JobCompaniesSummary = ReturnType<typeof summarizeEnterpriseGroupRows> & {
  visibleGroupCount: number;
  visibleActiveJobs: number;
  displayDisabledCount: number;
  crawlDisabledCount: number;
  companyDisplayDisabledCount: number;
};

export type JobCompaniesPayload = {
  summary: JobCompaniesSummary;
  groups: JobCompanyGroupView[];
  standaloneSources: JobCompanySourceView[];
};

function defaultPolicy(): JobCompanySourcePolicyView {
  return {
    crawlDisabled: false,
    displayDisabled: false,
    reason: null,
    updatedAt: null,
  };
}

function toPolicyView(policy: CrawlSourcePolicy | undefined): JobCompanySourcePolicyView {
  if (!policy) return defaultPolicy();
  return {
    crawlDisabled: policy.crawlDisabled,
    displayDisabled: policy.displayDisabled,
    reason: policy.reason,
    updatedAt: policy.updatedAt,
  };
}

function annotateAffiliates(
  sourceId: string,
  affiliates: DiscoveredAffiliate[],
  companyPolicyMap: Map<string, CrawlCompanyPolicy>,
): DiscoveredAffiliate[] {
  return affiliates.map((affiliate) => {
    const policy = companyPolicyMap.get(companyPolicyDocId(sourceId, affiliate.companyName));
    return {
      ...affiliate,
      crawlDisabled: policy?.crawlDisabled ?? false,
      displayDisabled: policy?.displayDisabled ?? false,
      reason: policy?.reason ?? null,
    };
  });
}

function visibleAffiliates(affiliates: DiscoveredAffiliate[]): DiscoveredAffiliate[] {
  return affiliates.filter((affiliate) => !affiliate.displayDisabled);
}

function toSourceView(
  company: CrawlerCompany,
  activeJobCount: number,
  discoveredAffiliates: DiscoveredAffiliate[],
  policy: CrawlSourcePolicy | undefined,
): JobCompanySourceView {
  return {
    sourceId: company.sourceId,
    sourceName: company.sourceName,
    companyName: company.name,
    careersUrl: company.careersUrl,
    activeJobCount,
    discoveredAffiliates,
    policy: toPolicyView(policy),
  };
}

function isVisibleSource(source: JobCompanySourceView | null): boolean {
  return Boolean(source && !source.policy.displayDisabled);
}

function buildSummary(
  groups: JobCompanyGroupView[],
  standaloneSources: JobCompanySourceView[],
  companyPolicyMap: Map<string, CrawlCompanyPolicy>,
): JobCompaniesSummary {
  const base = summarizeEnterpriseGroupRows(groups);
  const visibleGroups = groups.filter((group) => isVisibleSource(group.source));
  const visibleStandalone = standaloneSources.filter((source) => !source.policy.displayDisabled);
  const allSources = [
    ...groups.map((group) => group.source).filter((source): source is JobCompanySourceView => Boolean(source)),
    ...standaloneSources,
  ];

  return {
    ...base,
    visibleGroupCount: visibleGroups.length + visibleStandalone.length,
    visibleActiveJobs:
      visibleGroups.reduce((sum, group) => sum + group.activeJobCount, 0) +
      visibleStandalone.reduce((sum, source) => sum + source.activeJobCount, 0),
    displayDisabledCount: allSources.filter((source) => source.policy.displayDisabled).length,
    crawlDisabledCount: allSources.filter((source) => source.policy.crawlDisabled).length,
    companyDisplayDisabledCount: [...companyPolicyMap.values()].filter((policy) => policy.displayDisabled).length,
  };
}

function resolveAffiliateJobCount(
  affiliates: DiscoveredAffiliate[],
  crawlStatus: EnterpriseGroupRow['crawlStatus'],
): { affiliates: DiscoveredAffiliate[]; activeJobCount: number; crawlStatus: EnterpriseGroupRow['crawlStatus'] } {
  const activeJobCount = affiliates.reduce((sum, affiliate) => sum + affiliate.activeJobCount, 0);
  if (activeJobCount > 0) {
    return { affiliates, activeJobCount, crawlStatus: 'collected' };
  }
  if (crawlStatus === 'unlinked' || crawlStatus === 'pending') {
    return { affiliates, activeJobCount, crawlStatus };
  }
  return { affiliates, activeJobCount, crawlStatus: 'empty' };
}

export async function buildJobCompaniesPayload(options: {
  includeDisplayDisabled: boolean;
}): Promise<JobCompaniesPayload> {
  const [{ discoveredBySource, jobCountsBySource }, policies, companyPolicies] = await Promise.all([
    getCrawledJobSourceStats({ skipDisplayFilters: options.includeDisplayDisabled }),
    listCrawlSourcePolicies(),
    listCrawlCompanyPolicies(),
  ]);

  const policyMap = new Map(policies.map((policy) => [policy.sourceId, policy]));
  const companyPolicyMap = new Map(
    companyPolicies.map((policy) => [companyPolicyDocId(policy.sourceId, policy.companyName), policy]),
  );
  const crawlers = getCrawlerCompanies();
  const crawlerBySourceId = new Map(crawlers.map((company) => [company.sourceId, company]));
  const enterpriseRows = buildEnterpriseGroupRows(discoveredBySource, jobCountsBySource);

  const linkedSourceIds = new Set<string>();

  const groups: JobCompanyGroupView[] = enterpriseRows.map((row) => {
    const crawler = row.sourceId ? crawlerBySourceId.get(row.sourceId) : undefined;
    if (row.sourceId) linkedSourceIds.add(row.sourceId);

    let affiliates = row.sourceId
      ? annotateAffiliates(row.sourceId, row.discoveredAffiliates, companyPolicyMap)
      : row.discoveredAffiliates;

    if (!options.includeDisplayDisabled) {
      affiliates = visibleAffiliates(affiliates);
    }

    const counts = resolveAffiliateJobCount(affiliates, row.crawlStatus);
    const source = crawler
      ? toSourceView(
          crawler,
          counts.activeJobCount,
          counts.affiliates,
          policyMap.get(crawler.sourceId),
        )
      : null;

    const activeJobCount =
      source?.policy.displayDisabled && !options.includeDisplayDisabled ? 0 : counts.activeJobCount;

    return {
      ...row,
      discoveredAffiliates: counts.affiliates,
      activeJobCount,
      crawlStatus: source?.policy.displayDisabled && !options.includeDisplayDisabled ? 'empty' : counts.crawlStatus,
      source,
    };
  });

  const standaloneSources = crawlers
    .filter((company) => !linkedSourceIds.has(company.sourceId))
    .map((company) => {
      const affiliates = annotateAffiliates(
        company.sourceId,
        discoveredBySource[company.sourceId] ?? [],
        companyPolicyMap,
      );
      const visible = options.includeDisplayDisabled ? affiliates : visibleAffiliates(affiliates);
      const activeJobCount = visible.reduce((sum, affiliate) => sum + affiliate.activeJobCount, 0);

      return toSourceView(
        company,
        activeJobCount,
        visible,
        policyMap.get(company.sourceId),
      );
    });

  const filteredGroups = options.includeDisplayDisabled
    ? groups
    : groups.filter((group) => !group.source || !group.source.policy.displayDisabled);

  const filteredStandalone = options.includeDisplayDisabled
    ? standaloneSources
    : standaloneSources.filter((source) => !source.policy.displayDisabled);

  return {
    summary: buildSummary(groups, standaloneSources, companyPolicyMap),
    groups: filteredGroups,
    standaloneSources: filteredStandalone,
  };
}

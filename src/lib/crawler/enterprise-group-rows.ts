import { getCrawlerCompanies, type CrawlerCompany } from '@/lib/crawler/companies';
import { getCrawlAdapterStatus, type CrawlAdapterStatus } from '@/lib/crawler/targets';
import type { DiscoveredAffiliate } from '@/types/crawled-job';
import { getFtcEnterpriseGroups } from '@/lib/enterprise-groups';

export type EnterpriseGroupCrawlStatus = 'collected' | 'empty' | 'pending' | 'unlinked';

export type EnterpriseGroupRow = {
  rank: number;
  name: string;
  owner: string;
  ftcAffiliateCount: number;
  crawlStatus: EnterpriseGroupCrawlStatus;
  sourceId: string | null;
  sourceName: string | null;
  careersUrl: string | null;
  activeJobCount: number;
  discoveredAffiliates: DiscoveredAffiliate[];
};

function crawlerById(): Map<string, CrawlerCompany> {
  return new Map(getCrawlerCompanies().map((company) => [company.id, company]));
}

function resolveCrawlStatus(
  crawler: CrawlerCompany | undefined,
  activeJobCount: number,
): EnterpriseGroupCrawlStatus {
  if (!crawler) return 'unlinked';
  if (getCrawlAdapterStatus(crawler) !== 'active') return 'pending';
  return activeJobCount > 0 ? 'collected' : 'empty';
}

export function buildEnterpriseGroupRows(
  discoveredBySource: Record<string, DiscoveredAffiliate[]>,
  jobCountsBySource: Record<string, number>,
): EnterpriseGroupRow[] {
  const crawlers = crawlerById();

  return getFtcEnterpriseGroups().map((group) => {
    const crawler = group.crawlSourceId ? crawlers.get(group.crawlSourceId) : undefined;
    const activeJobCount = crawler ? jobCountsBySource[crawler.sourceId] ?? 0 : 0;

    return {
      rank: group.rank,
      name: group.name,
      owner: group.owner,
      ftcAffiliateCount: group.affiliateCount,
      crawlStatus: resolveCrawlStatus(crawler, activeJobCount),
      sourceId: crawler?.sourceId ?? null,
      sourceName: crawler?.sourceName ?? null,
      careersUrl: crawler?.careersUrl ?? null,
      activeJobCount,
      discoveredAffiliates: crawler ? discoveredBySource[crawler.sourceId] ?? [] : [],
    };
  });
}

export function summarizeEnterpriseGroupRows(rows: EnterpriseGroupRow[]) {
  const discoveredAffiliateCount = rows.reduce((sum, row) => sum + row.discoveredAffiliates.length, 0);
  const linkedCount = rows.filter((row) => row.crawlStatus !== 'unlinked').length;
  const collectedCount = rows.filter((row) => row.crawlStatus === 'collected').length;
  const emptyCount = rows.filter((row) => row.crawlStatus === 'empty').length;
  const pendingCount = rows.filter((row) => row.crawlStatus === 'pending').length;
  const unlinkedCount = rows.filter((row) => row.crawlStatus === 'unlinked').length;
  const withDiscoveredAffiliates = rows.filter((row) => row.discoveredAffiliates.length > 0).length;
  const totalActiveJobs = rows.reduce((sum, row) => sum + row.activeJobCount, 0);

  return {
    groupCount: rows.length,
    linkedCount,
    collectedCount,
    emptyCount,
    pendingCount,
    unlinkedCount,
    discoveredAffiliateCount,
    withDiscoveredAffiliates,
    totalActiveJobs,
  };
}

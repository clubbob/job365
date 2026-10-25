import { companyLabelsMatch } from '@/lib/crawler/company-name-match';
import { activeJobCountForMidSizedCrawlSource, type CrawledJobSourceStats } from '@/lib/crawled-jobs-server';
import { employerLabelsForRegistryCompany, findGroupAffiliateByRegistryName } from '@/lib/enterprise-groups/group-affiliate-registry';
import type { DiscoveredAffiliate } from '@/types/crawled-job';
import {
  buildRecruitingEmployerCountLookup,
  recruitingEmployerAggregatesFromStats,
  type RecruitingEmployerAggregate,
} from '@/lib/recruiting-employers/aggregate';

function countFromDiscoveredBySource(
  discoveredBySource: Record<string, DiscoveredAffiliate[]>,
  sourceId: string,
  labels: string[],
): number {
  const rows = discoveredBySource[sourceId];
  if (!rows?.length) return 0;

  let count = 0;
  for (const row of rows) {
    if (labels.some((label) => companyLabelsMatch(label, row.companyName))) {
      count = Math.max(count, row.activeJobCount);
    }
  }
  return count;
}

function countFromAggregates(aggregates: RecruitingEmployerAggregate[], labels: string[]): number {
  const lookup = buildRecruitingEmployerCountLookup(aggregates);
  let count = 0;
  for (const label of labels) {
    count = Math.max(count, lookup.countFor(label));
  }
  for (const row of aggregates) {
    if (labels.some((label) => companyLabelsMatch(label, row.companyName))) {
      count = Math.max(count, row.activeJobCount);
    }
  }
  return count;
}

/** 명단 회사명에 맞는 모집 공고 건수(별칭·집단 소스·전용 크롤 소스). */
export function activeJobCountForRegistryCompany(
  companyName: string,
  stats: CrawledJobSourceStats,
  crawlSourceId: string | null,
): number {
  const aggregates = recruitingEmployerAggregatesFromStats(stats);
  const labels = employerLabelsForRegistryCompany(companyName);
  let count = countFromAggregates(aggregates, labels);

  const link = findGroupAffiliateByRegistryName(companyName);
  if (link) {
    count = Math.max(
      count,
      countFromDiscoveredBySource(stats.discoveredBySource, link.groupSourceId, labels),
    );
    for (const row of aggregates) {
      if (!row.sourceIds.includes(link.groupSourceId)) continue;
      if (labels.some((label) => companyLabelsMatch(label, row.companyName))) {
        count = Math.max(count, row.activeJobCount);
      }
    }
  }

  if (crawlSourceId) {
    const isGroupPortalOnly = link && crawlSourceId === link.groupSourceId;
    if (!isGroupPortalOnly) {
      count = Math.max(count, activeJobCountForMidSizedCrawlSource(crawlSourceId, stats.jobCountsBySource));
      count = Math.max(count, stats.jobCountsBySource[crawlSourceId] ?? 0);
    }
  }

  return count;
}

import { getFtcEnterpriseGroups } from '@/lib/enterprise-groups';

let rankByCrawlSourceId: Map<string, number> | null = null;

function crawlSourceRankMap(): Map<string, number> {
  if (!rankByCrawlSourceId) {
    rankByCrawlSourceId = new Map(
      getFtcEnterpriseGroups()
        .filter((group) => group.crawlSourceId)
        .map((group) => [group.crawlSourceId!, group.rank]),
    );
  }
  return rankByCrawlSourceId;
}

/** 공시 집단 순위(1=삼성). 목록·수집 우선순위의 기준입니다. */
export function enterpriseFameRankByCrawlSourceId(crawlSourceId: string | null | undefined): number {
  if (!crawlSourceId) return 10_000;
  const base = crawlSourceId.replace(/-careers$/, '');
  return crawlSourceRankMap().get(base) ?? 10_000;
}

export function compareEnterpriseFameRank(rankA: number, rankB: number): number {
  return rankA - rankB;
}

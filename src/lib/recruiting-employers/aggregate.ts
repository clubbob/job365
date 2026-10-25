import { companyLabelsMatch, normalizeCompanyLabel } from '@/lib/crawler/company-name-match';
import { crawledJobRecruitingCompanyName } from '@/lib/job-display';

export type RecruitingEmployerAggregate = {
  companyName: string;
  activeJobCount: number;
  sourceIds: string[];
};

export type RecruitingEmployerJobRow = {
  sourceId: string;
  companyName: string;
  title: string;
};

function pickDisplayName(current: string, next: string): string {
  if (next.length > current.length) return next;
  return current;
}

export type RecruitingEmployerAggregateBucket = {
  companyName: string;
  activeJobCount: number;
  sourceIds: Set<string>;
};

export type RecruitingEmployerAggregateMap = Map<string, RecruitingEmployerAggregateBucket>;

export function createRecruitingEmployerAggregateMap(): RecruitingEmployerAggregateMap {
  return new Map();
}

/** 공고 1건의 모집 회사명을 집계 맵에 반영합니다(source stats 1회 순회용). */
export function addRecruitingEmployerToMap(
  map: RecruitingEmployerAggregateMap,
  sourceId: string,
  employer: string,
): void {
  const trimmed = employer.trim();
  if (!trimmed) return;

  const key = normalizeCompanyLabel(trimmed);
  if (!key) return;

  const existing = map.get(key);
  if (existing) {
    existing.activeJobCount += 1;
    existing.sourceIds.add(sourceId);
    existing.companyName = pickDisplayName(existing.companyName, trimmed);
  } else {
    map.set(key, {
      companyName: trimmed,
      activeJobCount: 1,
      sourceIds: new Set([sourceId]),
    });
  }
}

export function finalizeRecruitingEmployerAggregateMap(
  map: RecruitingEmployerAggregateMap,
): RecruitingEmployerAggregate[] {
  return [...map.values()]
    .map((item) => ({
      companyName: item.companyName,
      activeJobCount: item.activeJobCount,
      sourceIds: [...item.sourceIds],
    }))
    .sort((a, b) => b.activeJobCount - a.activeJobCount || a.companyName.localeCompare(b.companyName, 'ko'));
}

/** active 공고를 모집 회사명으로 묶어 건수를 셉니다. */
export function aggregateRecruitingEmployers(rows: RecruitingEmployerJobRow[]): RecruitingEmployerAggregate[] {
  const byKey = createRecruitingEmployerAggregateMap();

  for (const row of rows) {
    const employer = crawledJobRecruitingCompanyName(row).trim();
    if (!employer) continue;
    addRecruitingEmployerToMap(byKey, row.sourceId, employer);
  }

  return finalizeRecruitingEmployerAggregateMap(byKey);
}

export function recruitingEmployerCountFromNormMap(
  countByNorm: Record<string, number>,
  companyName: string,
): number {
  const norm = normalizeCompanyLabel(companyName);
  if (!norm) return 0;
  return countByNorm[norm] ?? 0;
}

export function buildRecruitingEmployerCountLookup(aggregates: RecruitingEmployerAggregate[]) {
  const byNorm = new Map<string, number>();
  for (const row of aggregates) {
    const key = normalizeCompanyLabel(row.companyName);
    if (!key) continue;
    byNorm.set(key, row.activeJobCount);
  }

  const fuzzyCache = new Map<string, number>();

  return {
    countFor(companyName: string): number {
      const norm = normalizeCompanyLabel(companyName);
      if (norm) {
        const cached = fuzzyCache.get(norm);
        if (cached !== undefined) return cached;

        const direct = byNorm.get(norm);
        if (direct !== undefined) {
          fuzzyCache.set(norm, direct);
          return direct;
        }
      }

      const match = aggregates.find((row) => companyLabelsMatch(row.companyName, companyName));
      const count = match?.activeJobCount ?? 0;
      if (norm) fuzzyCache.set(norm, count);
      return count;
    },
  };
}

export function recruitingEmployerCountForLabel(
  aggregates: RecruitingEmployerAggregate[],
  registryCompanyName: string,
): number {
  return buildRecruitingEmployerCountLookup(aggregates).countFor(registryCompanyName);
}

export function recruitingEmployerAggregatesFromStats(
  stats: Pick<CrawledJobSourceStats, 'recruitingEmployerAggregates' | 'recruitingEmployerCountByNorm'>,
): RecruitingEmployerAggregate[] {
  if (stats.recruitingEmployerAggregates.length > 0) return stats.recruitingEmployerAggregates;
  return Object.entries(stats.recruitingEmployerCountByNorm)
    .map(([norm, activeJobCount]) => ({
      companyName: norm,
      activeJobCount,
      sourceIds: [] as string[],
    }))
    .sort((a, b) => b.activeJobCount - a.activeJobCount || a.companyName.localeCompare(b.companyName, 'ko'));
}

type CrawledJobSourceStats = {
  recruitingEmployerAggregates: RecruitingEmployerAggregate[];
  recruitingEmployerCountByNorm: Record<string, number>;
};

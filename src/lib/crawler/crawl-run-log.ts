import type { CrawlRunSummary } from '@/lib/crawler/types';

export function countCrawlRunErrorSources(sources: CrawlRunSummary['sources']): number {
  return sources.filter((source) =>
    source.errors.some((line) => {
      const t = line.trim();
      if (!t) return false;
      if (t.startsWith('DB 배치:')) return false;
      if (t.startsWith('고용24')) return false;
      if (t.includes('WORK24_AUTH_KEY')) return false;
      return true;
    }),
  ).length;
}

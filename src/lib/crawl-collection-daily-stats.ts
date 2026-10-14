import { classifyCrawlSourceCollection } from '@/lib/crawl-collection-segment';
import type { CrawlRunListItem } from '@/lib/crawl-runs-server';
import { listCrawlRunsForStatsWindow } from '@/lib/crawl-runs-server';

export type DailyCrawlCollectionStatPoint = {
  date: string;
  total: number;
  enterprise: number;
  midSized: number;
  it: number;
};

function kstDateKeyFromDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date);
}

function runKstDateKey(run: CrawlRunListItem): string | null {
  const iso = run.finishedAt || run.startedAt || run.createdAt;
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return kstDateKeyFromDate(parsed);
}

function enumerateKstDates(days: number): string[] {
  const safeDays = Math.max(1, Math.min(Math.floor(days), 120));
  const dates: string[] = [];
  const today = new Date();
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    dates.push(kstDateKeyFromDate(d));
  }
  return dates;
}

type DayBucket = {
  total: number;
  enterprise: number;
  midSized: number;
  it: number;
};

export async function getDailyCrawlCollectionStats(days = 30): Promise<DailyCrawlCollectionStatPoint[]> {
  const safeDays = Math.max(1, Math.min(Math.floor(days), 120));
  const runs = await listCrawlRunsForStatsWindow(safeDays);
  const buckets = new Map<string, DayBucket>();

  for (const run of runs) {
    const dateKey = runKstDateKey(run);
    if (!dateKey) continue;

    const bucket = buckets.get(dateKey) ?? { total: 0, enterprise: 0, midSized: 0, it: 0 };

    for (const source of run.sources) {
      const sourceId = typeof source.sourceId === 'string' ? source.sourceId : '';
      const sourceName = typeof source.sourceName === 'string' ? source.sourceName : '';
      const upserted = Number(source.upserted ?? 0);
      if (!sourceId || !Number.isFinite(upserted) || upserted <= 0) continue;

      bucket.total += upserted;
      const flags = classifyCrawlSourceCollection(sourceId, sourceName);
      if (flags.enterprise) bucket.enterprise += upserted;
      if (flags.midSized) bucket.midSized += upserted;
      if (flags.it) bucket.it += upserted;
    }

    buckets.set(dateKey, bucket);
  }

  return enumerateKstDates(safeDays).map((date) => {
    const bucket = buckets.get(date);
    return {
      date,
      total: bucket?.total ?? 0,
      enterprise: bucket?.enterprise ?? 0,
      midSized: bucket?.midSized ?? 0,
      it: bucket?.it ?? 0,
    };
  });
}

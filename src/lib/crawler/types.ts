import type { CrawledJob } from '@/types/crawled-job';

export type CrawlerSourceResult = {
  sourceId: string;
  sourceName: string;
  jobs: CrawledJob[];
  errors: string[];
};

export type CrawlRunSummary = {
  startedAt: string;
  finishedAt: string;
  sources: Array<{
    sourceId: string;
    sourceName: string;
    fetched: number;
    upserted: number;
    closed: number;
    errors: string[];
  }>;
  totalUpserted: number;
  totalClosed: number;
};

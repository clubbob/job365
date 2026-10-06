import type { CrawledJob } from '@/types/crawled-job';

export type CrawlerSourceResult = {
  sourceId: string;
  sourceName: string;
  jobs: CrawledJob[];
  errors: string[];
  /** 페이지 조회는 성공했지만 유효 공고가 0건일 때 기존 공고를 마감 처리합니다. */
  syncEmpty?: boolean;
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

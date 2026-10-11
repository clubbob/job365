import type { CrawledJob } from '@/types/crawled-job';

export type CrawlerSourceResult = {
  sourceId: string;
  sourceName: string;
  jobs: CrawledJob[];
  errors: string[];
  /** 페이지 조회는 성공했지만 유효 공고가 0건일 때 기존 공고를 마감 처리합니다. */
  syncEmpty?: boolean;
};

/** 회사·소스 단위로 수집 직후 DB에 반영할 때 사용합니다. */
export type CrawlSourceResultSink = (result: CrawlerSourceResult) => void | Promise<void>;

export type CrawlBatchOptions = {
  onSourceResult?: CrawlSourceResultSink;
};

export type CrawlRunKind = 'daily' | 'mid-sized-only';

export type CrawlRunSummary = {
  runKind: CrawlRunKind;
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

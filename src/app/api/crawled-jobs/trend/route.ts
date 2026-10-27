import { NextResponse } from 'next/server';
import { getBrowsableCrawledJobsForTrend } from '@/lib/crawled-jobs-server';
import { listCrawlRunsPage } from '@/lib/crawl-runs-server';
import {
  buildJobBoardTrendView,
  countJobBoardTrendSnapshot,
  crawlFlowFromRuns,
} from '@/lib/job-board/trend';
import { persistJobBoardTrendSnapshot } from '@/lib/job-board/trend-server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [jobs, runsPage] = await Promise.all([
      getBrowsableCrawledJobsForTrend(),
      listCrawlRunsPage(1, 8).catch((error) => {
        console.warn('[crawled-jobs] trend crawl runs failed', error);
        return { runs: [] as Awaited<ReturnType<typeof listCrawlRunsPage>>['runs'] };
      }),
    ]);
    const live = countJobBoardTrendSnapshot(jobs);
    const store = await persistJobBoardTrendSnapshot(live);
    const view = buildJobBoardTrendView(live, store.previous, store.history);
    const flow = crawlFlowFromRuns(runsPage.runs);
    return NextResponse.json({
      ok: true,
      data: { ...view, ...flow },
    });
  } catch (error) {
    console.error('[crawled-jobs] trend failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'TREND_FAILED', message: '채용 트렌드를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

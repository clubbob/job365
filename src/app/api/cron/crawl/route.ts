import { NextResponse } from 'next/server';
import { runCrawlPipeline } from '@/lib/crawler/run';
import { verifyCronRequest } from '@/lib/cron-auth';

export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  try {
    const summary = await runCrawlPipeline();
    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    console.error('[cron/crawl] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'CRAWL_FAILED',
          message: error instanceof Error ? error.message : '크롤링에 실패했습니다.',
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

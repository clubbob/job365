import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { runCrawlPipeline } from '@/lib/crawler/run';

export const maxDuration = 300;

export async function POST() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const summary = await runCrawlPipeline();
    return NextResponse.json({ ok: true, data: { summary } });
  } catch (error) {
    console.error('[admin/crawl/run] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'CRAWL_FAILED',
          message: error instanceof Error ? error.message : '수집에 실패했습니다.',
        },
      },
      { status: 500 },
    );
  }
}

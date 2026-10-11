import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { formatCrawlRunErrorMessage } from '@/lib/crawler/crawl-error-message';
import { runCrawlPipeline } from '@/lib/crawler/run';

/** Vercel Hobby 등은 플랫폼 상한(약 300초)이 있습니다. 로컬·Pro에서는 더 길게 돌 수 있습니다. */
export const maxDuration = 800;

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
          message: formatCrawlRunErrorMessage(error),
        },
      },
      { status: 500 },
    );
  }
}

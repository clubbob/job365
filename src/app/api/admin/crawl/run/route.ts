import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { formatCrawlRunErrorMessage } from '@/lib/crawler/crawl-error-message';
import { runCrawlPipeline } from '@/lib/crawler/run';

/** Vercel Hobby 상한 300초. Pro는 800까지 가능하나 배포 호환을 위해 300으로 고정합니다. */
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
          message: formatCrawlRunErrorMessage(error),
        },
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { listCrawledJobs } from '@/lib/crawled-jobs-server';
import { getJobAlertPrefs } from '@/lib/job-alert-prefs-server';
import { jobMatchesSavedPrefs } from '@/lib/job-board/match';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? JOB_LIST_PAGE_SIZE) || JOB_LIST_PAGE_SIZE));

  try {
    const [prefs, all] = await Promise.all([getJobAlertPrefs(decoded.uid), listCrawledJobs()]);
    const matched = all.filter((job) => jobMatchesSavedPrefs(job, prefs));
    const total = matched.length;
    const items = matched.slice(0, page * pageSize);
    const hasMore = items.length < total;

    return NextResponse.json({
      ok: true,
      data: { items, total, page, pageSize, hasMore, prefs },
    });
  } catch (error) {
    console.error('[crawled-jobs/matched] failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'LIST_FAILED', message: '내 채용 공고를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

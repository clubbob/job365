import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { listCrawledJobs } from '@/lib/crawled-jobs-server';
import { getLastCrawlKoreaDayRange } from '@/lib/crawl-runs-server';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { getJobAlertPrefs } from '@/lib/job-alert-prefs-server';
import {
  hasJobAlertFilterPrefs,
  isJobFirstSeenOnDays,
  jobMatchesSavedPrefs,
  matchesCrawledJobKeyword,
} from '@/lib/job-board/match';
import { JOB_HOME_PAGE_SIZE, JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';
import { isCrawledJobPostingOpen } from '@/lib/job-board/crawled-deadline';
import { dedupeCrawledJobListItems } from '@/lib/job-board/dedupe-list-jobs';

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
  const q = searchParams.get('q') ?? '';

  try {
    const [prefs, all, crawlDays] = await Promise.all([
      getJobAlertPrefs(decoded.uid),
      listCrawledJobs(),
      getLastCrawlKoreaDayRange(),
    ]);
    const matched = dedupeCrawledJobListItems(
      all.filter(
        (job) =>
          job.status === 'active' &&
          isCrawledJobPostingOpen(job.deadline, job.title) &&
          jobMatchesSavedPrefs(job, prefs),
      ),
    );
    const list = matched.filter((job) =>
      matchesCrawledJobKeyword(job, q, { titleAndRecruitingCompanyOnly: true }),
    );
    const newList = list.filter((job) =>
      isJobFirstSeenOnDays(job, crawlDays.start, crawlDays.end),
    );
    const total = list.length;
    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);
    const hasMore = start + items.length < total;
    const todayDate = getKoreaDateLocalToday();

    return NextResponse.json({
      ok: true,
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore,
        prefs,
        noMatches: total === 0 && hasJobAlertFilterPrefs(prefs),
        todayDate,
        lastCrawlDayStart: crawlDays.start,
        lastCrawlDay: crawlDays.end,
        newTotal: newList.length,
        newItems: newList.slice(0, JOB_HOME_PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error('[crawled-jobs/matched] failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'LIST_FAILED', message: '맞춤 채용 공고를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

import { countBrowsableCrawledJobs } from '@/lib/crawled-jobs-server';
import { listCrawlRunsPage } from '@/lib/crawl-runs-server';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { listStoredInquiries } from '@/lib/inquiries-server';
import { listAllNotices } from '@/lib/notices-server';
import { listUserAccounts } from '@/lib/users-server';
import { listWithdrawalLogs } from '@/lib/withdrawals-server';

export type AdminDashboardStats = {
  members: { total: number };
  /** 구직자 채용 공고 목록과 동일 기준의 모집 중 건수 */
  jobs: {
    active: number;
    lastCrawlFinishedAt: string | null;
    lastCrawlUpserted: number;
  };
  inquiries: { total: number; pendingReply: number };
  withdrawals: { total: number; last7Days: number };
  notices: { total: number; published: number };
};

function isWithinLastDays(iso: string | null, days: number, todayKst: string): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const day = formatter.format(date);
  const start = new Date(`${todayKst}T12:00:00+09:00`);
  start.setDate(start.getDate() - days);
  const startDay = formatter.format(start);
  return day >= startDay && day <= todayKst;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const todayKst = getKoreaDateLocalToday();
  const db = getAdminFirestore();

  const [
    users,
    inquiries,
    withdrawals,
    notices,
    activeJobs,
    crawlPage,
  ] = await Promise.all([
    listUserAccounts(2000),
    db ? listStoredInquiries() : Promise.resolve([]),
    db ? listWithdrawalLogs(500) : Promise.resolve([]),
    db ? listAllNotices() : Promise.resolve([]),
    countBrowsableCrawledJobs().catch(() => 0),
    db ? listCrawlRunsPage(1, 1) : Promise.resolve({ runs: [], total: 0, page: 1, pageSize: 1, totalPages: 1 }),
  ]);

  const lastRun = crawlPage.runs[0];
  const pendingReply = inquiries.filter((item) => !item.reply).length;
  const published = notices.filter((item) => item.published).length;
  const withdrawalsLast7 = withdrawals.filter((item) =>
    isWithinLastDays(item.withdrawnAt, 7, todayKst),
  ).length;

  return {
    members: { total: users.length },
    jobs: {
      active: activeJobs,
      lastCrawlFinishedAt: lastRun?.finishedAt?.trim() ? lastRun.finishedAt : lastRun?.createdAt ?? null,
      lastCrawlUpserted: lastRun?.totalUpserted ?? 0,
    },
    inquiries: { total: inquiries.length, pendingReply },
    withdrawals: { total: withdrawals.length, last7Days: withdrawalsLast7 },
    notices: { total: notices.length, published },
  };
}

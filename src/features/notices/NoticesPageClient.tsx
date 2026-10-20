'use client';

import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatNoticeDateTime } from '@/lib/notice-display';
import type { Notice } from '@/types/notice';

export default function NoticesPageClient({ notices }: { notices: Notice[] }) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="공지 사항"
        description="서비스 이용 안내와 업데이트 소식입니다. 제목을 눌러 전체 내용을 확인할 수 있습니다."
      />

      <Card>
        {notices.length === 0 ? (
          <p className="text-sm text-muted">등록된 공지사항이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/notices/${encodeURIComponent(notice.id)}`}
                  aria-label={`${notice.title} 공지 내용 보기`}
                  className="group flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="min-w-0 flex-1 font-semibold text-foreground group-hover:text-primary">
                    {notice.title}
                  </span>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <time
                      className="text-sm text-muted"
                      dateTime={notice.publishedAt || notice.createdAt}
                    >
                      {formatNoticeDateTime(notice.publishedAt || notice.createdAt)}
                    </time>
                    <span
                      className="inline-flex items-center rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                      aria-hidden
                    >
                      내용 보기
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

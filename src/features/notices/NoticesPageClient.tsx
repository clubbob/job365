'use client';

import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatNoticeDateTime } from '@/lib/notice-display';
import type { Notice } from '@/types/notice';

export default function NoticesPageClient({ notices }: { notices: Notice[] }) {
  return (
    <div className="space-y-5">
      <PageHeader title="공지 사항" description="서비스 이용 안내와 업데이트 소식을 확인합니다." showRefresh={false} />

      <Card>
        {notices.length === 0 ? (
          <p className="text-sm text-muted">등록된 공지 사항이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/notices/${encodeURIComponent(notice.id)}`}
                  className="flex flex-col gap-1 py-3 transition-colors hover:bg-neutral-50/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-1"
                >
                  <span className="font-semibold text-foreground">{notice.title}</span>
                  <time
                    className="shrink-0 text-sm text-muted"
                    dateTime={notice.publishedAt || notice.createdAt}
                  >
                    {formatNoticeDateTime(notice.publishedAt || notice.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

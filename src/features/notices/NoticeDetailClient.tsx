'use client';

import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatNoticeDateTime } from '@/lib/notice-display';
import type { Notice } from '@/types/notice';

export default function NoticeDetailClient({ notice }: { notice: Notice }) {
  const displayDate = notice.publishedAt || notice.createdAt;

  return (
    <div className="space-y-5">
      <PageHeader
        title="공지사항"
        description={notice.title}
        showRefresh={false}
        homeHref="/notices"
        homeLabel="목록으로"
      />

      <Card>
        <p className="text-sm text-muted">
          <time dateTime={displayDate}>{formatNoticeDateTime(displayDate)}</time>
        </p>
        <h2 className="mt-2 text-lg font-bold text-foreground">{notice.title}</h2>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{notice.body}</div>
      </Card>
    </div>
  );
}

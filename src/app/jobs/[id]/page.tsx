import { Suspense } from 'react';
import CrawledJobDetailPageClient from '@/features/job-board/CrawledJobDetailPageClient';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="py-8 text-center text-sm text-muted">불러오는 중…</p>}>
      <CrawledJobDetailPageClient jobId={id} />
    </Suspense>
  );
}

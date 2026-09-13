import { Suspense } from 'react';
import JobDetailPageClient from '@/features/jobs/JobDetailPageClient';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="py-8 text-center text-sm text-muted">불러오는 중…</p>}>
      <JobDetailPageClient jobId={id} />
    </Suspense>
  );
}

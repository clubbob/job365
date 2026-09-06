import JobDetailPageClient from '@/features/jobs/JobDetailPageClient';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobDetailPageClient jobId={id} />;
}

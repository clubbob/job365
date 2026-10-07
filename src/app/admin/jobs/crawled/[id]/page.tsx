import AdminCrawledJobDetailClient from '@/features/admin/AdminCrawledJobDetailClient';

export default async function AdminCrawledJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminCrawledJobDetailClient jobId={decodeURIComponent(id)} />;
}

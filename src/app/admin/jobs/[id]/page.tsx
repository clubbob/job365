import AdminJobDetailClient from '@/features/admin/AdminJobDetailClient';

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminJobDetailClient jobId={decodeURIComponent(id)} />;
}

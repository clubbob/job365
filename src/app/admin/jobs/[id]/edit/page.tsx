import AdminJobEditClient from '@/features/admin/AdminJobEditClient';

export default async function AdminJobEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminJobEditClient jobId={decodeURIComponent(id)} />;
}

import AdminTalentDetailClient from '@/features/admin/AdminTalentDetailClient';

export default async function AdminTalentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminTalentDetailClient talentId={decodeURIComponent(id)} />;
}

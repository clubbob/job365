import AdminTalentEditClient from '@/features/admin/AdminTalentEditClient';

export default async function AdminTalentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminTalentEditClient talentId={decodeURIComponent(id)} />;
}

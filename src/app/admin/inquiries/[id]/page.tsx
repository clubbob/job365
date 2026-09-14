import AdminInquiryDetailClient from '@/features/admin/AdminInquiryDetailClient';

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminInquiryDetailClient inquiryId={decodeURIComponent(id)} />;
}

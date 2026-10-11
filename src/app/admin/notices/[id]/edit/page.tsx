import AdminNoticeFormClient from '@/features/admin/AdminNoticeFormClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminNoticeEditPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminNoticeFormClient mode="edit" noticeId={id} />;
}

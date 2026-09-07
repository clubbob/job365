import TalentDetailPageClient from '@/features/talents/TalentDetailPageClient';

export default async function TalentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TalentDetailPageClient talentId={id} />;
}

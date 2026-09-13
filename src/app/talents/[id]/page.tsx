import { Suspense } from 'react';
import TalentDetailPageClient from '@/features/talents/TalentDetailPageClient';

export default async function TalentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="py-8 text-center text-sm text-muted">불러오는 중…</p>}>
      <TalentDetailPageClient talentId={id} />
    </Suspense>
  );
}

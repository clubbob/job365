import { Suspense } from 'react';
import TalentNewPageClient from '@/features/talents/TalentNewPageClient';

export default function TalentNewPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">불러오는 중…</p>}>
      <TalentNewPageClient />
    </Suspense>
  );
}

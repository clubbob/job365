'use client';

import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import TalentList from '@/features/talents/TalentList';
import { LIST_PAGE_SIZE } from '@/lib/list-page';

export default function TalentsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="인재 정보"
        description="알바부터 정규직까지, 이용료 없이 인재 정보를 찾아보세요."
      />

      <AdSlot placement="header" />
      <TalentList pageSize={LIST_PAGE_SIZE} persistKey="talents" />
    </div>
  );
}

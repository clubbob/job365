import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import JobList from '@/features/jobs/JobList';

export default function JobsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader title="채용 공고" description="알바, 재택, 프리랜서 공고를 한곳에서 확인하세요." />
      <AdSlot placement="header" />
      <JobList />
    </div>
  );
}

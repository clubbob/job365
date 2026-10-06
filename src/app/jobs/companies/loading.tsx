import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { COMPANIES_PAGE_DESCRIPTION } from '@/lib/site-menu-copy';

export default function JobCompaniesLoading() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="채용 공고 회사"
        description={COMPANIES_PAGE_DESCRIPTION}
        homeHref="/jobs"
        homeLabel="채용 공고"
      />
      <Card>
        <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>
      </Card>
    </div>
  );
}

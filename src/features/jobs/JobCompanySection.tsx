import { DetailSection, DetailStatGrid, DetailText } from '@/components/ui/PostingDetail';
import {
  jobCompanyBusinessNumberLabel,
  jobCompanyEmployeeCountLabel,
  jobCompanyFoundedLabel,
  jobCompanyRevenueLabel,
  jobCompanyWebsiteHref,
  resolveJobCompany,
} from '@/lib/job-company';
import type { JobPosting } from '@/types/job';

export default function JobCompanySection({
  job,
  ownerId,
}: {
  job: JobPosting;
  ownerId?: string;
}) {
  const company = resolveJobCompany(job, ownerId);
  const website = company.website?.trim() || '';

  return (
    <>
      <DetailStatGrid
        title="회사 정보"
        items={[
          { label: '회사명', value: company.companyName },
          { label: '사업자등록번호', value: jobCompanyBusinessNumberLabel(company.businessNumber) },
          { label: '대표자명', value: company.ceo },
          { label: '전화번호', value: company.phone },
          { label: '팩스번호', value: company.fax },
          { label: '설립일', value: jobCompanyFoundedLabel(company.foundedOn) },
          { label: '직원 수', value: jobCompanyEmployeeCountLabel(company.employeeCount) },
          { label: '전년 매출액', value: jobCompanyRevenueLabel(company.lastYearRevenue) },
          { label: '사업장 주소', value: company.address },
          { label: '홈페이지', value: website, href: jobCompanyWebsiteHref(website) },
        ]}
      />
      <DetailSection title="회사 소개">
        <DetailText value={company.intro} />
      </DetailSection>
    </>
  );
}

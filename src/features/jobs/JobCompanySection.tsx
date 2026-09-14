import { DetailStatGrid, DetailText } from '@/components/ui/PostingDetail';
import { jobCompanyMainItems, jobCompanyRegistrantItems, resolveJobCompany } from '@/lib/job-company';
import type { JobPosting } from '@/types/job';

export default function JobCompanySection({
  job,
  ownerId,
}: {
  job: JobPosting;
  ownerId?: string;
}) {
  const company = resolveJobCompany(job, ownerId);

  return (
    <div className="space-y-5">
      <DetailStatGrid embedded items={jobCompanyMainItems(company)} />
      <div>
        <p className="text-[11px] font-medium tracking-wide text-subtle">회사 소개</p>
        <div className="mt-1">
          <DetailText value={company.intro} />
        </div>
      </div>
      <DetailStatGrid embedded items={jobCompanyRegistrantItems(company)} />
    </div>
  );
}

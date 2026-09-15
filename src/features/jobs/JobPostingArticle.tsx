import type { ReactNode } from 'react';
import { DetailBadge, DetailHero, DetailSection, DetailStatGrid, DetailText } from '@/components/ui/PostingDetail';
import JobCompanySection from '@/features/jobs/JobCompanySection';
import { jobCareerLabel, jobDetailItems, jobEducationLabel, jobOutlineItems } from '@/lib/job-display';
import { jobOccupationsLabel, jobRegionsLabel } from '@/lib/work-preferences';
import { jobWorkTypesLabel, type JobPosting } from '@/types/job';

export default function JobPostingArticle({
  job,
  ownerId,
  extraBadges,
}: {
  job: JobPosting;
  ownerId?: string;
  extraBadges?: ReactNode;
}) {
  const workType = jobWorkTypesLabel(job);
  const career = jobCareerLabel(job);
  const education = jobEducationLabel(job.education);
  const occupations = jobOccupationsLabel(job);
  const region = jobRegionsLabel(job);

  return (
    <>
      <DetailHero
        eyebrow={job.companyName}
        title={job.title}
        badges={
          <>
            {extraBadges}
            <DetailBadge tone="primary">{workType}</DetailBadge>
            {region ? <DetailBadge>{region}</DetailBadge> : null}
            {occupations ? <DetailBadge>{occupations}</DetailBadge> : null}
            {career ? <DetailBadge>{career}</DetailBadge> : null}
            {education ? <DetailBadge>{education}</DetailBadge> : null}
          </>
        }
      />

      <DetailSection title="회사 정보">
        <JobCompanySection job={job} ownerId={ownerId} />
      </DetailSection>
      <DetailSection title="모집 요강">
        <DetailStatGrid embedded items={jobOutlineItems(job)} />
      </DetailSection>
      <DetailSection title="상세 내용">
        <div className="space-y-5">
          {jobDetailItems(job).map((item) => (
            <div key={item.label}>
              <p className="text-[11px] font-medium tracking-wide text-subtle">{item.label}</p>
              <div className="mt-1">
                <DetailText value={item.value} />
              </div>
            </div>
          ))}
        </div>
      </DetailSection>
    </>
  );
}

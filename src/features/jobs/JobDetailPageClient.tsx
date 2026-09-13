'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import {
  DetailBadge,
  DetailHero,
  DetailSection,
  DetailStatGrid,
  DetailText,
} from '@/components/ui/PostingDetail';
import JobCompanySection from '@/features/jobs/JobCompanySection';
import JobDetailActions from '@/features/jobs/JobDetailActions';
import { getJobById } from '@/lib/job-catalog';
import { jobCareerLabel, jobDeadlineLabel, jobEducationLabel, jobHeadcountLabel } from '@/lib/job-display';
import { jobPositionLabel, jobWorkTypesLabel, type JobPosting } from '@/types/job';

export default function JobDetailPageClient({ jobId }: { jobId: string }) {
  const searchParams = useSearchParams();
  const fromMypage = searchParams.get('from') === 'mypage';
  const listHref = fromMypage ? '/mypage?tab=jobs&sub=jobs' : '/jobs';
  const listLabel = fromMypage ? '돌아가기' : '이전 목록으로';
  const [job, setJob] = useState<JobPosting | null | undefined>(undefined);

  useEffect(() => {
    setJob(getJobById(jobId) ?? null);
  }, [jobId]);

  if (job === undefined) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!job) {
    return (
      <div className="space-y-5">
        <PageHeader title="채용 정보" homeHref={listHref} homeLabel={listLabel} />
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-muted">채용 정보를 찾을 수 없습니다.</p>
          <Link href={listHref} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            {listLabel}
          </Link>
        </div>
      </div>
    );
  }

  const career = jobCareerLabel(job);
  const education = jobEducationLabel(job.education);
  const headcount = jobHeadcountLabel(job.headcount);
  const workType = jobWorkTypesLabel(job);
  const deadline = job.deadline ? jobDeadlineLabel(job.deadline) : null;

  return (
    <div className="space-y-5">
      <PageHeader title="채용 정보" description={job.companyName} homeHref={listHref} homeLabel={listLabel} />
      <AdSlot placement="header" />

      <article className="space-y-4">
        <DetailHero
          eyebrow={job.companyName}
          title={job.title}
          badges={
            <>
              <DetailBadge tone="primary">{workType}</DetailBadge>
              {career ? <DetailBadge>{career}</DetailBadge> : null}
              {education ? <DetailBadge>{education}</DetailBadge> : null}
            </>
          }
          highlightLabel="지급 기준"
          highlightValue={job.payLabel}
          facts={[
            { label: '근무지', value: job.location },
            { label: '접수 마감', value: deadline || '—' },
            { label: '모집 인원', value: headcount || '—' },
          ]}
        />

        <JobCompanySection job={job} />

        <DetailStatGrid
          items={[
            { label: '근무 형태', value: workType },
            { label: '모집 인원', value: headcount },
            { label: '경력 유무', value: career },
            { label: '학력', value: education },
            { label: '직급/직책', value: jobPositionLabel(job.positionLevel) },
            { label: '수습 기간', value: job.probation },
            { label: '근무지', value: job.location },
            { label: '근무 요일', value: job.workDays },
            { label: '근무 시간', value: job.workHours },
            { label: '접수 마감', value: deadline },
          ]}
        />

        <DetailSection title="담당 업무">
          <DetailText value={job.summary} />
        </DetailSection>
        <DetailSection title="자격 요건">
          <DetailText value={job.requirements} />
        </DetailSection>
        <DetailSection title="우대 사항">
          <DetailText value={job.preferred} />
        </DetailSection>
        <DetailSection title="복리후생">
          <DetailText value={job.benefits} />
        </DetailSection>
        <DetailSection title="전형 절차">
          <DetailText value={job.process} />
        </DetailSection>

        <JobDetailActions key={job.id} job={job} />
      </article>

      <AdSlot placement="detail" />
    </div>
  );
}

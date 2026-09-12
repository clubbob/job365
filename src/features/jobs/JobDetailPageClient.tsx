'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import {
  DetailBadge,
  DetailHero,
  DetailSection,
  DetailStatGrid,
  DetailText,
} from '@/components/ui/PostingDetail';
import JobDetailActions from '@/features/jobs/JobDetailActions';
import { formatBusinessNumber } from '@/lib/business-number';
import { getJobById } from '@/lib/job-catalog';
import {
  jobCareerLabel,
  jobDeadlineLabel,
  jobEducationLabel,
  jobHeadcountLabel,
} from '@/lib/job-display';
import { WORK_TYPE_LABELS, type JobPosting } from '@/types/job';

export default function JobDetailPageClient({ jobId }: { jobId: string }) {
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
        <PageHeader title="채용 정보" homeHref="/jobs" homeLabel="이전 목록으로" />
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-muted">채용 정보를 찾을 수 없습니다.</p>
          <Link href="/jobs" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            이전 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const career = jobCareerLabel(job);
  const education = jobEducationLabel(job.education);
  const headcount = jobHeadcountLabel(job.headcount);
  const workType = WORK_TYPE_LABELS[job.workType];
  const deadline = job.deadline ? jobDeadlineLabel(job.deadline) : null;
  const businessNumber = job.businessNumber ? formatBusinessNumber(job.businessNumber) : '';

  return (
    <div className="space-y-5">
      <PageHeader title="채용 정보" description={job.companyName} homeHref="/jobs" homeLabel="이전 목록으로" />
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

        <DetailStatGrid
          items={[
            { label: '회사명', value: job.companyName },
            { label: '사업자등록번호', value: businessNumber },
            { label: '근무 형태', value: workType },
            { label: '모집 인원', value: headcount },
            { label: '경력 유무', value: career },
            { label: '학력', value: education },
            { label: '직급/직책', value: job.positionLevel },
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

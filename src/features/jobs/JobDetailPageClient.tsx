'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { getJobById } from '@/lib/job-catalog';
import {
  jobCareerLabel,
  jobDeadlineLabel,
  jobHeadcountLabel,
} from '@/lib/job-display';
import { PAY_TYPE_LABELS, WORK_TYPE_LABELS, type JobPosting } from '@/types/job';

function DetailSection({ title, body }: { title: string; body?: string }) {
  if (!body?.trim()) return null;
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-muted">{body}</p>
    </section>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

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
  const headcount = jobHeadcountLabel(job.headcount);

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title}
        description={job.companyName}
        homeHref="/jobs"
        homeLabel="이전 목록으로"
      />
      <AdSlot placement="header" />
      <article className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {WORK_TYPE_LABELS[job.workType]}
          </span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
            {PAY_TYPE_LABELS[job.payType]}
          </span>
          {career ? (
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
              {career}
            </span>
          ) : null}
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtle">급여</dt>
            <dd className="mt-0.5 font-semibold text-primary">{job.payLabel}</dd>
          </div>
          <Fact label="근무지" value={job.location} />
          <Fact label="모집 인원" value={headcount} />
          <Fact label="학력" value={job.education} />
          <Fact label="근무 시간" value={job.workHours} />
          <Fact label="접수 마감" value={job.deadline ? jobDeadlineLabel(job.deadline) : null} />
        </dl>
        <DetailSection title="담당 업무" body={job.summary} />
        <DetailSection title="자격 요건" body={job.requirements} />
        <DetailSection title="우대 사항" body={job.preferred} />
        <DetailSection title="복리후생" body={job.benefits} />
        {job.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-muted">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          disabled
          className="mt-6 w-full rounded-lg bg-primary/70 px-4 py-3 text-sm font-semibold text-white"
        >
          지원하기 (다음 단계에서 열립니다)
        </button>
      </article>
      <AdSlot placement="detail" />
    </div>
  );
}

import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { SAMPLE_JOBS } from '@/lib/sample-jobs';
import { PAY_TYPE_LABELS, WORK_TYPE_LABELS } from '@/types/job';

export default function JobDetailPageClient({ jobId }: { jobId: string }) {
  const job = SAMPLE_JOBS.find((item) => item.id === jobId);

  if (!job) {
    return (
      <div className="space-y-5">
        <PageHeader title="채용 정보" homeHref="/jobs" homeLabel="이전 목록으로" />
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-muted">공고를 찾을 수 없습니다.</p>
          <Link href="/jobs" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            이전 목록으로
          </Link>
        </div>
      </div>
    );
  }

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
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtle">급여</dt>
            <dd className="mt-0.5 font-semibold text-primary">{job.payLabel}</dd>
          </div>
          <div>
            <dt className="text-subtle">근무지</dt>
            <dd className="mt-0.5 font-medium text-foreground">{job.location}</dd>
          </div>
        </dl>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">{job.summary}</p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-muted">
              {tag}
            </span>
          ))}
        </div>
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

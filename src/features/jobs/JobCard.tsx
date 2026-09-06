import Link from 'next/link';
import type { JobPosting } from '@/types/job';
import { WORK_TYPE_LABELS } from '@/types/job';

export default function JobCard({ job }: { job: JobPosting }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-xl border border-border bg-surface p-4 shadow-card transition hover:border-primary/40 hover:shadow-card-hover"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {WORK_TYPE_LABELS[job.workType]}
        </span>
        <span className="text-xs text-subtle">{job.createdAt}</span>
      </div>
      <h3 className="text-base font-bold leading-snug text-foreground">{job.title}</h3>
      <p className="mt-1 text-sm font-medium text-muted">{job.companyName}</p>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{job.summary}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-primary">{job.payLabel}</span>
        <span className="text-subtle">{job.location}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-muted">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

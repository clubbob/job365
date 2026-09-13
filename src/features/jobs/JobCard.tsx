import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { JobPosting } from '@/types/job';
import { jobWorkTypesLabel } from '@/types/job';

export default function JobCard({
  job,
  onNavigate,
  className,
  badge,
}: {
  job: JobPosting;
  onNavigate?: () => void;
  className?: string;
  badge?: string;
}) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      onClick={onNavigate}
      className={cn(
        'flex h-full flex-col rounded-xl border border-border bg-surface p-3 shadow-card transition hover:border-primary/40 hover:shadow-card-hover sm:p-4',
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {jobWorkTypesLabel(job)}
        </span>
        {badge ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/30">
            {badge}
          </span>
        ) : null}
        <span className="text-xs text-subtle">{job.createdAt}</span>
      </div>
      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">{job.title}</h3>
      <p className="mt-1 truncate text-sm font-medium text-muted">{job.companyName}</p>
      <p className="mt-2 line-clamp-2 text-xs text-muted sm:text-sm">{job.summary}</p>
      <div className="mt-auto flex flex-col gap-2 pt-3">
        <div className="flex flex-wrap items-end justify-between gap-1 text-sm">
          <span className="font-semibold text-primary">{job.payLabel}</span>
          <span className="text-xs text-subtle">{job.location}</span>
        </div>
      </div>
    </Link>
  );
}

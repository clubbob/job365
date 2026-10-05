import Link from 'next/link';
import { isJobNewToday } from '@/lib/job-board/match';
import { cn } from '@/lib/utils';
import type { CrawledJobListItem } from '@/types/crawled-job';

function employmentLabel(types: CrawledJobListItem['employmentTypes']): string {
  return types.length > 0 ? types.join(' · ') : '—';
}

function regionLabel(regions: CrawledJobListItem['regions']): string {
  return regions.length > 0 ? regions.join(', ') : '—';
}

function deadlineLabel(deadline: string | null): string {
  if (!deadline) return '채용 시까지';
  return `~ ${deadline}`;
}

export default function CrawledJobCard({
  job,
  todayDate,
  onNavigate,
  className,
}: {
  job: CrawledJobListItem;
  todayDate?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const isNew = todayDate ? isJobNewToday(job, todayDate) : false;

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
          {employmentLabel(job.employmentTypes)}
        </span>
        {isNew ? (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">New</span>
        ) : null}
        <span className="text-xs text-subtle">{job.sourceName}</span>
      </div>

      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">{job.title}</h3>
      <p className="mt-1 truncate text-sm font-medium text-muted">{job.companyName}</p>
      <p className="mt-1 truncate text-xs text-muted sm:text-sm">{regionLabel(job.regions)}</p>
      <p className="mt-1 truncate text-xs text-muted sm:text-sm">{job.roles.join(', ')}</p>

      <div className="mt-auto pt-3 text-xs text-muted sm:text-sm">
        마감 {deadlineLabel(job.deadline)}
      </div>
    </Link>
  );
}

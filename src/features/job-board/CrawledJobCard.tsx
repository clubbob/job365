import Link from 'next/link';
import {
  crawledJobDetailTitle,
  shouldShowCrawledCollectSource,
  splitCrawledJobHeading,
} from '@/lib/job-display';
import {
  CRAWLED_JOB_DETAIL_FROM_MY_JOBS,
  crawledJobDetailHref,
} from '@/lib/job-board/detail-navigation';
import { jobBoardCompanySegmentLabel } from '@/lib/job-board/company-segment';
import { effectiveCrawledJobDeadline } from '@/lib/job-board/crawled-deadline';
import { rolesForCrawledJob } from '@/lib/crawler/map-fields';
import { isCrawledJobNew } from '@/lib/job-board/match';
import { cn } from '@/lib/utils';
import type { CrawledJobListItem } from '@/types/crawled-job';

function employmentLabel(types: CrawledJobListItem['employmentTypes']): string {
  return types.length > 0 ? types.join(' · ') : '—';
}

function roleLabel(roles: CrawledJobListItem['roles']): string {
  return roles.length > 0 ? roles.join(', ') : '—';
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
  lastCrawlDayStart,
  lastCrawlDay,
  highlightNew = false,
  onNavigate,
  detailFrom,
  listReturnQuery,
  className,
}: {
  job: CrawledJobListItem;
  todayDate?: string;
  lastCrawlDayStart?: string;
  lastCrawlDay?: string;
  highlightNew?: boolean;
  onNavigate?: () => void;
  detailFrom?: typeof CRAWLED_JOB_DETAIL_FROM_MY_JOBS;
  listReturnQuery?: string;
  className?: string;
}) {
  const isNew =
    highlightNew ||
    isCrawledJobNew(job, lastCrawlDayStart, lastCrawlDay) ||
    (todayDate ? isCrawledJobNew(job, todayDate, todayDate) : false);
  const heading = splitCrawledJobHeading(job.companyName, job.title);
  const displayTitle = crawledJobDetailTitle(job.title, heading.title, heading.employer);
  const showCollectSource = shouldShowCrawledCollectSource(heading.employer, heading.sourceCompany);
  const companySegment = jobBoardCompanySegmentLabel(job);

  return (
    <Link
      href={crawledJobDetailHref(job.id, detailFrom, listReturnQuery)}
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
      </div>

      {heading.employer ? (
        <p className="line-clamp-1 text-sm font-bold leading-snug text-primary sm:text-base" title={heading.employer}>
          {heading.employer}
        </p>
      ) : null}
      <h3
        className={cn(
          'line-clamp-3 min-h-[2.75rem] break-words text-sm font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:min-h-[3rem] sm:text-base',
          heading.employer ? 'mt-1.5' : undefined,
        )}
        title={displayTitle}
      >
        {displayTitle}
      </h3>
      <dl className="mt-1.5 space-y-1">
        {showCollectSource ? (
          <div className="flex min-w-0 gap-2 text-xs sm:text-sm">
            <dt className="shrink-0 font-medium text-subtle">수집 출처</dt>
            <dd className="min-w-0 truncate font-medium text-foreground/85" title={heading.sourceCompany}>
              {heading.sourceCompany}
            </dd>
          </div>
        ) : null}
        <div className="flex min-w-0 gap-2 text-xs sm:text-sm">
          <dt className="shrink-0 font-medium text-subtle">회사 분류</dt>
          <dd className="min-w-0 truncate font-medium text-foreground/85">{companySegment}</dd>
        </div>
        <div className="flex min-w-0 gap-2 text-xs sm:text-sm">
          <dt className="shrink-0 font-medium text-subtle">직무</dt>
          <dd className="min-w-0 truncate font-medium text-foreground/85">{roleLabel(rolesForCrawledJob(job))}</dd>
        </div>
        <div className="flex min-w-0 gap-2 text-xs sm:text-sm">
          <dt className="shrink-0 font-medium text-subtle">지역</dt>
          <dd className="min-w-0 truncate font-medium text-foreground/85">{regionLabel(job.regions)}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-3 text-xs text-muted sm:text-sm">
        마감 {deadlineLabel(effectiveCrawledJobDeadline(job.deadline, job.title))}
      </div>
    </Link>
  );
}

import Link from 'next/link';
import {
  JOB_BOARD_COMPANY_SEGMENTS,
  emptyCompanySegmentCounts,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';
import { HOME_COVERAGE_TITLE } from '@/lib/site-menu-copy';
import { cn } from '@/lib/utils';

export type HomeJobCoverageStats = {
  total: number;
  bySegment: Record<JobBoardCompanySegment, number>;
};

const SEGMENT_ACCENT: Record<JobBoardCompanySegment, string> = {
  대기업: 'hover:border-sky-300 hover:bg-sky-50',
  중견기업: 'hover:border-amber-300 hover:bg-amber-50',
  'IT 회사': 'hover:border-violet-300 hover:bg-violet-50',
  '반도체·디스플레이 장비사': 'hover:border-emerald-300 hover:bg-emerald-50',
};

function jobsHrefForSegment(segment: JobBoardCompanySegment): string {
  const params = new URLSearchParams();
  params.set('companySegment', segment);
  return `/jobs?${params.toString()}`;
}

function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

type HomeJobCoverageProps = {
  stats?: HomeJobCoverageStats | null;
};

export default function HomeJobCoverage({ stats }: HomeJobCoverageProps) {
  const total = stats?.total ?? 0;
  const bySegment = stats?.bySegment ?? emptyCompanySegmentCounts();
  if (total <= 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5" aria-labelledby="home-coverage-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="home-coverage-heading" className="text-lg font-bold text-foreground">
          {HOME_COVERAGE_TITLE}
        </h2>
        <Link
          href="/jobs"
          className="inline-flex items-baseline gap-1 rounded-lg text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">{formatCount(total)}</span>
          <span className="text-sm font-semibold">건</span>
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {JOB_BOARD_COMPANY_SEGMENTS.map((segment) => (
          <li key={segment} className="min-w-0">
            <Link
              href={jobsHrefForSegment(segment)}
              className={cn(
                'flex h-full flex-col rounded-xl border border-border bg-neutral-50 px-3 py-3 transition',
                SEGMENT_ACCENT[segment],
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
            >
              <span className="break-keep text-sm font-semibold leading-snug text-foreground">{segment}</span>
              <span className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground">
                {formatCount(bySegment[segment] ?? 0)}
                <span className="ml-0.5 text-sm font-semibold text-muted">건</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

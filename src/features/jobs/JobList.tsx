'use client';

import { useMemo, useState } from 'react';
import AdSlot from '@/components/ads/AdSlot';
import JobCard from '@/features/jobs/JobCard';
import { SAMPLE_JOBS } from '@/lib/sample-jobs';
import { cn } from '@/lib/utils';
import { WORK_TYPE_FILTERS } from '@/types/job';

export default function JobList() {
  const [filter, setFilter] = useState<(typeof WORK_TYPE_FILTERS)[number]['id']>('all');

  const jobs = useMemo(() => {
    const selected = WORK_TYPE_FILTERS.find((item) => item.id === filter);
    if (!selected?.types) return SAMPLE_JOBS;
    return SAMPLE_JOBS.filter((job) => selected.types?.includes(job.workType));
  }, [filter]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {WORK_TYPE_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              filter === item.id
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {jobs.map((job, index) => (
          <div key={job.id} className="space-y-3">
            <JobCard job={job} />
            {index === 1 && <AdSlot placement="infeed" />}
          </div>
        ))}
      </div>

      {jobs.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          해당 조건의 공고가 없습니다.
        </p>
      )}
    </section>
  );
}

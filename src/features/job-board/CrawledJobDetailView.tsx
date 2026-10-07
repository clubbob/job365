import {
  DetailBadge,
  DetailHero,
  DetailSection,
  DetailStatGrid,
} from '@/components/ui/PostingDetail';
import CrawledJobDescriptionSummary from '@/features/job-board/CrawledJobDescriptionSummary';
import {
  getCrawledJobOriginalUrl,
  getCrawledJobSourcePageUrl,
} from '@/lib/crawler/source-url';
import { crawledJobHeadcountLabel } from '@/lib/job-display';
import { isJobNewToday } from '@/lib/job-board/match';
import type { CrawledJob } from '@/types/crawled-job';
import type { ReactNode } from 'react';

export const crawledJobExternalLinkClass =
  'font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60';

export function CrawledJobSourceNotice({ originalJobUrl }: { originalJobUrl: string }) {
  return (
    <p className="rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm text-muted">
      이 공고는 외부 채용 사이트에서 수집했습니다.{' '}
      <a
        href={originalJobUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={crawledJobExternalLinkClass}
      >
        원문 공고
      </a>
      에서 직접 확인할 수 있습니다.
    </p>
  );
}

export default function CrawledJobDetailView({
  job,
  todayDate,
  actions,
}: {
  job: CrawledJob;
  todayDate: string;
  actions?: ReactNode;
}) {
  const isNew = todayDate ? isJobNewToday(job, todayDate) : false;
  const sourcePageUrl = getCrawledJobSourcePageUrl(job.sourceId, job.applyUrl);
  const originalJobUrl = getCrawledJobOriginalUrl(job.applyUrl);

  return (
    <article className="space-y-4">
      <CrawledJobSourceNotice originalJobUrl={originalJobUrl} />

      <DetailHero
        eyebrow={job.companyName}
        title={job.title}
        badges={
          <>
            {job.employmentTypes.map((type) => (
              <DetailBadge key={type} tone="primary">{type}</DetailBadge>
            ))}
            {isNew ? <DetailBadge tone="primary">New</DetailBadge> : null}
          </>
        }
      />

      <DetailSection title="모집 요강">
        <DetailStatGrid
          embedded
          embeddedColumns={4}
          items={[
            { label: '회사', value: job.companyName },
            { label: '채용 형태', value: job.employmentTypes.join(', ') },
            { label: '직무', value: job.roles.join(', ') },
            { label: '지역', value: job.regions.join(', ') },
            { label: '채용 인원', value: crawledJobHeadcountLabel(job.headcount) },
            { label: '마감일', value: job.deadline ?? '채용 시까지' },
            { label: '출처', value: job.sourceName, href: sourcePageUrl },
          ]}
        />
      </DetailSection>

      {job.description ? (
        <CrawledJobDescriptionSummary
          html={job.description}
          originalJobUrl={originalJobUrl}
          deadline={job.deadline}
          linkClassName={crawledJobExternalLinkClass}
        />
      ) : null}

      {actions ? <div className="flex flex-col gap-2">{actions}</div> : null}
    </article>
  );
}

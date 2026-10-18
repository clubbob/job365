import {
  DetailBadge,
  DetailHero,
  DetailSection,
  DetailStatGrid,
} from '@/components/ui/PostingDetail';
import { getCrawledJobSummaryFields } from '@/features/job-board/CrawledJobDescriptionSummary';
import { getCrawledJobOriginalUrl } from '@/lib/crawler/source-url';
import {
  crawledJobDetailTitle,
  crawledJobHeadcountDisplay,
  splitCrawledJobHeading,
} from '@/lib/job-display';
import { effectiveCrawledJobDeadline } from '@/lib/job-board/crawled-deadline';
import { isJobNewToday } from '@/lib/job-board/match';
import type { CrawledJob } from '@/types/crawled-job';
import type { ReactNode } from 'react';

export const crawledJobExternalLinkClass =
  'font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60';

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
  const originalJobUrl = getCrawledJobOriginalUrl(job.applyUrl);
  const heading = splitCrawledJobHeading(job.companyName, job.title);
  const companyHints = [heading.employer, heading.sourceCompany, job.companyName].filter(Boolean);
  const descriptionFields = job.description
    ? getCrawledJobSummaryFields(job.description, companyHints)
    : [];

  const workField = descriptionFields.find((field) => field.label === '업무');
  const processField = descriptionFields.find((field) => field.label === '전형');
  const headcount = crawledJobHeadcountDisplay(job.headcount, job.description);
  const effectiveDeadline = effectiveCrawledJobDeadline(job.deadline, job.title);
  const deadline = effectiveDeadline ?? '채용 시까지';

  const outlineItems = [
    { label: '모집 회사', value: heading.employer },
    { label: '직무', value: job.roles.join(', ') },
    { label: '지역', value: job.regions.join(', ') },
    { label: '채용 형태', value: job.employmentTypes.join(', ') },
    ...(processField
      ? [
          { label: '채용 인원', value: headcount },
          { label: '마감일', value: deadline },
          { label: '전형', value: processField.value, colSpan: 2 as const },
        ]
      : [
          { label: '채용 인원', value: headcount, colSpan: 2 as const },
          { label: '마감일', value: deadline, colSpan: 2 as const },
        ]),
    ...(workField ? [{ label: '업무', value: workField.value, colSpan: 4 as const }] : []),
    {
      label: '수집 출처',
      value: heading.sourceCompany,
      href: originalJobUrl,
      colSpan: 4 as const,
      hrefWrap: true,
    },
  ];

  return (
    <article className="space-y-4">
      <DetailHero
        eyebrow={heading.employer}
        title={crawledJobDetailTitle(job.title, heading.title, heading.employer, workField?.value)}
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
        <DetailStatGrid embedded embeddedColumns={4} items={outlineItems} />
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted">
          이 공고는 외부 채용 사이트에서 수집했습니다. 상세 내용은{' '}
          <a
            href={originalJobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={crawledJobExternalLinkClass}
          >
            원문 공고
          </a>
          에서 직접 확인하세요. 지원하기를 누르면 해당 사이트로 연결되고, 찜하기를 누르면 마이페이지 찜한 공고에서 다시 볼 수 있습니다.
        </p>
      </DetailSection>

      {actions ? <div className="flex flex-col items-center gap-2">{actions}</div> : null}
    </article>
  );
}

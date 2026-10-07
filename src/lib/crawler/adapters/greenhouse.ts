import {
  buildDescription,
  defaultCompanySize,
  inferJobRoles,
  mapLocationToRegions,
  parseEmploymentTypesFromText,
} from '@/lib/crawler/map-fields';
import { fetchJson } from '@/lib/crawler/fetch-json';
import type { CrawledJob } from '@/types/crawled-job';
import type { CrawlerSourceResult } from '@/lib/crawler/types';

export type GreenhouseCompanyConfig = {
  sourceId: string;
  sourceName: string;
  companyName: string;
  boardToken: string;
  careersUrl: string;
  koreaOnly?: boolean;
};

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string;
  updated_at?: string;
  first_published?: string;
  language?: string;
};

type GreenhouseResponse = {
  jobs: GreenhouseJob[];
};

function decodeGreenhouseHtml(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isKoreaLocation(name?: string): boolean {
  if (!name?.trim()) return false;
  return /korea|seoul|서울|busan|부산|incheon|인천|gyeonggi|경기|suwon|수원|pangyo|판교|daejeon|대전|daegu|대구|gwangju|광주|ulsan|울산|sejong|세종|jeju|제주/i.test(
    name,
  );
}

function toKoreanApplyUrl(url: string): string {
  return url.replace('/en/jobs/', '/kr/jobs/');
}

function toCrawledJob(job: GreenhouseJob, config: GreenhouseCompanyConfig, crawledAt: string): CrawledJob | null {
  const title = job.title?.trim();
  if (!title || !job.id) return null;

  const locationName = job.location?.name ?? '';
  const content = job.content ? decodeGreenhouseHtml(job.content) : '';
  const createdAt = job.first_published ? new Date(job.first_published).toISOString() : crawledAt;

  return {
    id: `${config.sourceId}-${job.id}`,
    sourceId: config.sourceId,
    sourceName: config.sourceName,
    companyName: config.companyName,
    title,
    employmentTypes: parseEmploymentTypesFromText(title),
    roles: inferJobRoles(title, undefined, locationName),
    regions: mapLocationToRegions(locationName),
    companySize: defaultCompanySize(config.companyName),
    headcount: null,
    deadline: null,
    applyUrl: toKoreanApplyUrl(job.absolute_url),
    description: content ? buildDescription([`<section><h3>상세 내용</h3>${content}</section>`]) : '',
    status: 'active',
    crawledAt,
    createdAt,
    closedAt: null,
  };
}

export async function crawlGreenhouseCareers(config: GreenhouseCompanyConfig): Promise<CrawlerSourceResult> {
  const crawledAt = new Date().toISOString();
  const jobs: CrawledJob[] = [];
  const errors: string[] = [];

  try {
    const data = await fetchJson<GreenhouseResponse>(
      `https://boards-api.greenhouse.io/v1/boards/${config.boardToken}/jobs?content=true`,
    );

    const byId = new Map<string, CrawledJob>();
    for (const item of data.jobs ?? []) {
      if (config.koreaOnly && !isKoreaLocation(item.location?.name)) continue;

      try {
        const mapped = toCrawledJob(item, config, crawledAt);
        if (mapped) byId.set(mapped.id, mapped);
      } catch (error) {
        errors.push(
          `${config.companyName}(${item.id}): ${error instanceof Error ? error.message : '변환 실패'}`,
        );
      }
    }

    jobs.push(...byId.values());
  } catch (error) {
    errors.push(`${config.companyName}: ${error instanceof Error ? error.message : '수집 실패'}`);
  }

  return {
    sourceId: config.sourceId,
    sourceName: config.sourceName,
    jobs,
    errors,
  };
}

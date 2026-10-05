import {
  buildDescription,
  defaultCompanySize,
  inferJobRoles,
  mapLocationToRegions,
  normalizeNaverCompanyName,
  parseEmploymentTypesFromText,
} from '@/lib/crawler/map-fields';
import { fetchJson } from '@/lib/crawler/fetch-json';
import { fetchText } from '@/lib/crawler/fetch-text';
import type { CrawledJob } from '@/types/crawled-job';
import type { CrawlerSourceResult } from '@/lib/crawler/types';

const SOURCE_ID = 'naver-careers';
const SOURCE_NAME = '네이버 채용';
const BASE_URL = 'https://recruit.navercorp.com';
const PAGE_SIZE = 10;
const ACTIVE_STATE_CODES = new Set(['0040']);

type NaverJob = {
  annoId: number;
  sysCompanyCdNm: string;
  annoSubject: string;
  entTypeCdNm: string;
  empTypeCdNm?: string;
  classCdNm?: string;
  subJobCdNm?: string;
  workAreaCd?: string;
  staYmdTime?: string;
  endYmd?: string;
  endYmdTime?: string;
  stateCd?: string;
  stateCdNm?: string;
  jobDetailLink?: string;
};

type NaverListResponse = {
  result: string;
  list: NaverJob[];
  totalSize: number;
};

const SECTION_TITLES = ['소개', '업무 내용', '자격 요건'];

export function extractNaverDetailHtml(pageHtml: string): string {
  const boxes = [
    ...pageHtml.matchAll(
      /<div class="detail_box">\s*<h4 class="detail_title">([^<]*)<\/h4>\s*<p class="detail_text">([\s\S]*?)<\/p>\s*<\/div>/g,
    ),
  ];

  if (boxes.length === 0) return '';

  return boxes
    .map((match, index) => {
      const customTitle = match[1].trim();
      const title = customTitle || SECTION_TITLES[index] || `상세 ${index + 1}`;
      return `<section><h3>${title}</h3>${match[2]}</section>`;
    })
    .join('');
}

async function fetchNaverJobList(): Promise<NaverJob[]> {
  const jobs: NaverJob[] = [];
  let firstIndex = 0;

  while (true) {
    const data = await fetchJson<NaverListResponse>(
      `${BASE_URL}/rcrt/loadJobList.do?sw=&firstIndex=${firstIndex}`,
    );

    if (data.result !== 'Y' || !Array.isArray(data.list) || data.list.length === 0) break;

    jobs.push(...data.list);
    firstIndex += PAGE_SIZE;

    if (firstIndex >= data.totalSize) break;
  }

  return jobs;
}

async function fetchNaverJobDescription(annoId: number): Promise<string> {
  const html = await fetchText(`${BASE_URL}/rcrt/view.do?annoId=${annoId}`);
  return extractNaverDetailHtml(html);
}

function isActiveJob(item: NaverJob): boolean {
  if (item.stateCd && !ACTIVE_STATE_CODES.has(item.stateCd)) return false;
  if (item.stateCdNm && /마감|종료|취소/.test(item.stateCdNm)) return false;
  return true;
}

async function toCrawledJob(item: NaverJob, crawledAt: string): Promise<CrawledJob | null> {
  const title = item.annoSubject?.trim();
  if (!title || !item.annoId) return null;

  const companyName = normalizeNaverCompanyName(item.sysCompanyCdNm || '네이버');
  const applyUrl = item.jobDetailLink || `${BASE_URL}/rcrt/view.do?annoId=${item.annoId}`;
  const closed = !isActiveJob(item);
  const createdAt = item.staYmdTime ? new Date(item.staYmdTime).toISOString() : crawledAt;

  let description = '';
  try {
    description = await fetchNaverJobDescription(item.annoId);
  } catch {
    description = '';
  }

  return {
    id: `${SOURCE_ID}-${item.annoId}`,
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    companyName,
    title,
    employmentTypes: parseEmploymentTypesFromText(title, item.entTypeCdNm, item.empTypeCdNm ?? ''),
    roles: inferJobRoles(title, undefined, item.classCdNm ?? '', item.subJobCdNm ?? ''),
    regions: mapLocationToRegions(item.workAreaCd === '0010' ? '분당' : undefined),
    companySize: defaultCompanySize(companyName),
    deadline: item.endYmd ? `${item.endYmd.slice(0, 4)}-${item.endYmd.slice(4, 6)}-${item.endYmd.slice(6, 8)}` : null,
    applyUrl,
    description: buildDescription([description]),
    status: closed ? 'closed' : 'active',
    crawledAt,
    createdAt,
    closedAt: closed ? crawledAt : null,
  };
}

export async function crawlNaverCareers(): Promise<CrawlerSourceResult> {
  const crawledAt = new Date().toISOString();
  const jobs: CrawledJob[] = [];
  const errors: string[] = [];

  try {
    const list = await fetchNaverJobList();
    const byId = new Map<string, CrawledJob>();

    for (const item of list) {
      try {
        const mapped = await toCrawledJob(item, crawledAt);
        if (mapped) byId.set(mapped.id, mapped);
      } catch (error) {
        errors.push(
          `네이버(${item.annoId}): ${error instanceof Error ? error.message : '변환 실패'}`,
        );
      }
    }

    jobs.push(...byId.values());
  } catch (error) {
    errors.push(`네이버: ${error instanceof Error ? error.message : '수집 실패'}`);
  }

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    jobs,
    errors,
  };
}

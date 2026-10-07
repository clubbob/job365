import {
  buildDescription,
  defaultCompanySize,
  inferJobRoles,
  mapLocationToRegions,
  parseEmploymentTypesFromTitle,
} from '@/lib/crawler/map-fields';
import { fetchJson } from '@/lib/crawler/fetch-json';
import type { CrawledJob } from '@/types/crawled-job';
import type { CrawlerSourceResult } from '@/lib/crawler/types';

const SOURCE_ID = 'kakao-careers';
const SOURCE_NAME = '카카오 채용';
const BASE_URL = 'https://careers.kakao.com';

const PARTS = ['TECHNOLOGY', 'DESIGN', 'BUSINESS_SERVICES', 'STAFF'] as const;

type KakaoJob = {
  realId: string;
  jobOfferTitle: string;
  companyName: string;
  closeFlag: boolean;
  statusCode: string;
  endDate: string | null;
  regDate: string;
  uptDate: string;
  introduction?: string;
  workContentDesc?: string;
  qualification?: string;
  jobOfferProcessDesc?: string;
  locationName?: string;
  jobPart?: string;
  privateFlag?: boolean;
};

type KakaoListResponse = {
  jobList: KakaoJob[];
  totalJobCount: number;
};

function toCrawledJob(item: KakaoJob, crawledAt: string): CrawledJob | null {
  if (item.privateFlag) return null;

  const title = item.jobOfferTitle?.trim();
  const companyName = item.companyName?.trim() || '카카오';
  if (!title || !item.realId) return null;

  const closed = item.closeFlag || item.statusCode !== 'PROGRESS';
  const createdAt = item.regDate ? new Date(item.regDate).toISOString() : crawledAt;

  return {
    id: `${SOURCE_ID}-${item.realId}`,
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    companyName,
    title,
    employmentTypes: parseEmploymentTypesFromTitle(title),
    roles: inferJobRoles(title, item.jobPart),
    regions: mapLocationToRegions(item.locationName),
    companySize: defaultCompanySize(companyName),
    headcount: null,
    deadline: item.endDate ? item.endDate.slice(0, 10) : null,
    applyUrl: `${BASE_URL}/jobs/${item.realId}`,
    description: buildDescription([
      item.introduction ? `<section><h3>소개</h3>${item.introduction}</section>` : '',
      item.workContentDesc ? `<section><h3>업무 내용</h3>${item.workContentDesc}</section>` : '',
      item.qualification ? `<section><h3>자격 요건</h3>${item.qualification}</section>` : '',
      item.jobOfferProcessDesc ? `<section><h3>전형 절차</h3>${item.jobOfferProcessDesc}</section>` : '',
    ]),
    status: closed ? 'closed' : 'active',
    crawledAt,
    createdAt,
    closedAt: closed ? crawledAt : null,
  };
}

export async function crawlKakaoCareers(): Promise<CrawlerSourceResult> {
  const crawledAt = new Date().toISOString();
  const jobs: CrawledJob[] = [];
  const errors: string[] = [];

  for (const part of PARTS) {
    try {
      const url = `${BASE_URL}/public/api/job-list?page=0&size=100&part=${part}`;
      const data = await fetchJson<KakaoListResponse>(url);
      for (const item of data.jobList ?? []) {
        const mapped = toCrawledJob(item, crawledAt);
        if (mapped) jobs.push(mapped);
      }
    } catch (error) {
      errors.push(`카카오(${part}): ${error instanceof Error ? error.message : '수집 실패'}`);
    }
  }

  const byId = new Map<string, CrawledJob>();
  for (const job of jobs) byId.set(job.id, job);

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    jobs: [...byId.values()],
    errors,
  };
}

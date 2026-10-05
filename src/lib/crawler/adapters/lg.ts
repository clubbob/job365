import {
  buildDescription,
  defaultCompanySize,
  inferJobRoles,
  mapLocationToRegions,
  parseEmploymentTypesFromText,
  textSection,
} from '@/lib/crawler/map-fields';
import { postJson } from '@/lib/crawler/fetch-json';
import type { CrawledJob } from '@/types/crawled-job';
import type { CrawlerSourceResult } from '@/lib/crawler/types';

const SOURCE_ID = 'lg-careers';
const SOURCE_NAME = 'LG 채용';
const API_BASE = 'https://api.careers.lg.com/rmk';
const SITE_BASE = 'https://careers.lg.com';

type LgListItem = {
  jobNoticeId: number;
  careerTypeName?: string;
  recruitTypeName?: string;
  companyCode?: string;
  companyName?: string;
  jobNoticeName?: string;
  recDateDiff?: number;
  recEndDateTime?: string;
  noticeStatus?: string;
  noticeStatusName?: string;
  jobGroupName?: string;
  jobGroupName2?: string;
  workLocationName?: string;
};

type LgListResponse = {
  status: string;
  data?: {
    jobNoticeList?: LgListItem[];
  };
};

type LgDetailRecord = {
  jobNoticeId?: number;
  jobNoticeName?: string;
  companyName?: string;
  careerTypeName?: string;
  recruitTypeName?: string;
  recStartDate?: string;
  recEndDate?: string;
  workLocation?: string;
  recruitJobName?: string;
  mainDutyInfo?: string;
  qualForAppInfo?: string;
  recProcessInfo?: string;
  submitMethodInfo?: string;
  contactInfo?: string;
  otherInfo?: string;
  jobGroupSh?: string;
  noticeStatus?: string;
};

type LgDetailResponse = {
  status: string;
  data?: {
    jobNoticesDetail?: {
      jobNoticesDetail?: LgDetailRecord;
    } & LgDetailRecord;
  };
};

const LIST_BODY = {
  lnbSearch: '',
  hashTagText: '',
  recDate: 'POST_START_DATE',
  order: 'DESC',
  careerList: [],
  companyCodeList: [],
  desireLocList: [],
  jobGroupList: [],
};

async function fetchLgJobList(): Promise<LgListItem[]> {
  const data = await postJson<LgListResponse>(`${API_BASE}/job/retrieveJobNoticesList`, LIST_BODY);
  if (data.status !== 'S' || !data.data?.jobNoticeList) return [];
  return data.data.jobNoticeList.filter((item) => item.noticeStatus === 'POSTING');
}

async function fetchLgJobDetail(jobNoticeId: number): Promise<LgDetailRecord | null> {
  const data = await postJson<LgDetailResponse>(`${API_BASE}/job/retrieveJobNoticesDetail`, {
    jobNoticeId,
  });
  if (data.status !== 'S' || !data.data?.jobNoticesDetail) return null;

  const detail = data.data.jobNoticesDetail;
  if (detail.jobNoticesDetail) return detail.jobNoticesDetail;
  return detail;
}

function parseLgDeadline(recEndDate?: string, recEndDateTime?: string): string | null {
  const raw = recEndDate?.trim() || recEndDateTime?.trim();
  if (!raw) return null;
  const match = raw.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function buildLgDescription(detail: LgDetailRecord | null): string {
  if (!detail) return '';

  return buildDescription([
    textSection('주요 업무', detail.mainDutyInfo),
    textSection('자격 요건', detail.qualForAppInfo),
    textSection('전형 절차', detail.recProcessInfo),
    textSection('지원 방법', detail.submitMethodInfo),
    textSection('문의', detail.contactInfo),
    textSection('기타', detail.otherInfo),
  ]);
}

async function toCrawledJob(item: LgListItem, crawledAt: string): Promise<CrawledJob | null> {
  const title = item.jobNoticeName?.trim();
  const companyName = item.companyName?.trim();
  if (!title || !item.jobNoticeId || !companyName) return null;

  let detail: LgDetailRecord | null = null;
  try {
    detail = await fetchLgJobDetail(item.jobNoticeId);
  } catch {
    detail = null;
  }

  const merged = detail ?? item;
  const locationLabel = detail?.workLocation ?? item.workLocationName ?? '';
  const roleLabel = [detail?.recruitJobName, detail?.jobGroupSh, item.jobGroupName, item.jobGroupName2]
    .filter(Boolean)
    .join(' ');

  return {
    id: `${SOURCE_ID}-${item.jobNoticeId}`,
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    companyName,
    title,
    employmentTypes: parseEmploymentTypesFromText(
      title,
      merged.careerTypeName ?? '',
      merged.recruitTypeName ?? '',
    ),
    roles: inferJobRoles(title, undefined, roleLabel),
    regions: mapLocationToRegions(locationLabel),
    companySize: defaultCompanySize(companyName),
    deadline: parseLgDeadline(detail?.recEndDate, item.recEndDateTime),
    applyUrl: `${SITE_BASE}/apply/detail?id=${item.jobNoticeId}`,
    description: buildLgDescription(detail),
    status: 'active',
    crawledAt,
    createdAt: crawledAt,
    closedAt: null,
  };
}

export async function crawlLgCareers(): Promise<CrawlerSourceResult> {
  const crawledAt = new Date().toISOString();
  const jobs: CrawledJob[] = [];
  const errors: string[] = [];

  try {
    const list = await fetchLgJobList();
    const byId = new Map<string, CrawledJob>();

    for (const item of list) {
      try {
        const mapped = await toCrawledJob(item, crawledAt);
        if (mapped) byId.set(mapped.id, mapped);
      } catch (error) {
        errors.push(
          `LG(${item.jobNoticeId}): ${error instanceof Error ? error.message : '변환 실패'}`,
        );
      }
    }

    jobs.push(...byId.values());
  } catch (error) {
    errors.push(`LG: ${error instanceof Error ? error.message : '수집 실패'}`);
  }

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    jobs,
    errors,
  };
}

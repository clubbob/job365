import {
  buildDescription,
  defaultCompanySize,
  inferJobRoles,
  mapLocationToRegions,
  parseEmploymentTypesFromText,
  textSection,
} from '@/lib/crawler/map-fields';
import { fetchJson } from '@/lib/crawler/fetch-json';
import { fetchText } from '@/lib/crawler/fetch-text';
import type { CrawledJob } from '@/types/crawled-job';
import type { CrawlerSourceResult } from '@/lib/crawler/types';

const SOURCE_ID = 'samsung-careers';
const SOURCE_NAME = '삼성 채용';
const LIST_URL = 'https://www.samsungcareers.com/hr/list.data';
const DETAIL_URL = 'https://www.samsungcareers.com/recruit/detail.data';
const SITE_BASE = 'https://www.samsungcareers.com';

const BROWSER_HEADERS = {
  Accept: 'text/html,application/json,*/*',
  Referer: 'https://www.samsungcareers.com/hr/?search=',
  Origin: SITE_BASE,
  'X-Requested-With': 'XMLHttpRequest',
};

type SamsungListItem = {
  seq: number;
  companyName: string;
  title: string;
  employmentLabel: string;
  period: string;
  roleLabels: string[];
};

type SamsungDetailResult = {
  seq?: number;
  title?: string;
  startdate?: string;
  enddate?: string;
  cmpNameKr?: string;
  introKr?: string;
  qlfctKr?: string;
  stepKr?: string;
  processKr?: string;
  docInfoKr?: string;
  etcKr?: string;
  mainTel?: string;
  email?: string;
};

type SamsungDetailResponse = {
  success?: boolean;
  data?: {
    result?: SamsungDetailResult;
    items?: Array<{ jobNameKr?: string; dutyKr?: string; skillKr?: string }>;
  };
};

function parseSeq(raw: string): number {
  return Number.parseInt(raw.replace(/,/g, ''), 10);
}

function parseListPagination(html: string): { maxPage: number } {
  const match = html.match(/class="divCnt"[^>]*data-max="(\d+)"/);
  return { maxPage: match ? Number.parseInt(match[1], 10) : 1 };
}

function parseListItems(html: string): SamsungListItem[] {
  const items: SamsungListItem[] = [];

  for (const block of html.split('<li>').slice(1)) {
    const shareMatch = block.match(/class="btnShare"[^>]*data-value="([^"]+)"/);
    const companyMatch = block.match(/<p class="company">\s*([^<]+)/);
    const titleMatch = block.match(/<h3 class="title">([^<]+)/);
    const employmentMatch = block.match(/<p class="info">[\s\S]*?<span>\s*([^<]+)/);
    const periodMatch = block.match(/<span class="period">\s*([^<]+)/);
    const roleLabels = [...block.matchAll(/<span class="flag grey">([^<]+)</g)].map((m) => m[1].trim());

    const seq = shareMatch ? parseSeq(shareMatch[1]) : 0;
    const companyName = companyMatch?.[1]?.trim() ?? '';
    const title = titleMatch?.[1]?.trim() ?? '';

    if (!seq || !title) continue;

    items.push({
      seq,
      companyName,
      title,
      employmentLabel: employmentMatch?.[1]?.trim() ?? '',
      period: periodMatch?.[1]?.trim() ?? '',
      roleLabels,
    });
  }

  return items;
}

function parsePeriodDeadline(period: string, enddate?: string): string | null {
  const fromPeriod = period.match(/~\s*(\d{4})\.(\d{2})\.(\d{2})/);
  if (fromPeriod) return `${fromPeriod[1]}-${fromPeriod[2]}-${fromPeriod[3]}`;

  if (enddate?.length >= 8) {
    return `${enddate.slice(0, 4)}-${enddate.slice(4, 6)}-${enddate.slice(6, 8)}`;
  }

  return null;
}

function buildListBody(page: number): string {
  return new URLSearchParams({
    currentPageNo: String(page),
    intNo: '0',
    strVal: '',
    strTxt: '',
    strKey: '',
    strCompany: '',
    strType: '',
    strOrderBy: '',
    strEntity: '',
  }).toString();
}

async function fetchSamsungListPage(page: number): Promise<{ items: SamsungListItem[]; maxPage: number }> {
  const html = await fetchText(LIST_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: buildListBody(page),
  });

  const { maxPage } = parseListPagination(html);
  return { items: parseListItems(html), maxPage };
}

async function fetchSamsungList(): Promise<SamsungListItem[]> {
  const first = await fetchSamsungListPage(1);
  const bySeq = new Map<number, SamsungListItem>();
  for (const item of first.items) bySeq.set(item.seq, item);

  for (let page = 2; page <= first.maxPage; page += 1) {
    const next = await fetchSamsungListPage(page);
    for (const item of next.items) bySeq.set(item.seq, item);
  }

  return [...bySeq.values()];
}

async function fetchSamsungDetail(seq: number): Promise<SamsungDetailResponse | null> {
  try {
    return await fetchJson<SamsungDetailResponse>(`${DETAIL_URL}?seqno=${seq}&strCode=`, {
      headers: BROWSER_HEADERS,
    });
  } catch {
    return null;
  }
}

function buildSamsungDescription(detail: SamsungDetailResponse | null): string {
  const result = detail?.data?.result;
  if (!result) return '';

  const jobItems = detail?.data?.items ?? [];
  const jobSections = jobItems
    .map((item) => {
      const parts = [
        item.jobNameKr ? `<strong>${item.jobNameKr}</strong>` : '',
        item.dutyKr ? textSection('수행 업무', item.dutyKr) : '',
        item.skillKr ? textSection('필요 역량', item.skillKr) : '',
      ].filter(Boolean);
      return parts.join('');
    })
    .join('');

  return buildDescription([
    textSection('소개', result.introKr),
    jobSections,
    textSection('자격 요건', result.qlfctKr),
    textSection('전형 일정', result.stepKr),
    textSection('지원 방법', result.processKr),
    textSection('제출 서류', result.docInfoKr),
    textSection('문의', [result.mainTel, result.email].filter(Boolean).join(' / ')),
    textSection('기타', result.etcKr),
  ]);
}

async function toCrawledJob(item: SamsungListItem, crawledAt: string): Promise<CrawledJob | null> {
  const detail = await fetchSamsungDetail(item.seq);
  const result = detail?.data?.result;
  const companyName = result?.cmpNameKr?.trim() || item.companyName.trim() || '삼성';
  const title = result?.title?.trim() || item.title.trim();
  const roleLabel = item.roleLabels.join(' ');

  return {
    id: `${SOURCE_ID}-${item.seq}`,
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    companyName,
    title,
    employmentTypes: parseEmploymentTypesFromText(title, item.employmentLabel),
    roles: inferJobRoles(title, undefined, roleLabel),
    regions: mapLocationToRegions(companyName),
    companySize: defaultCompanySize(companyName),
    deadline: parsePeriodDeadline(item.period, result?.enddate),
    applyUrl: `${SITE_BASE}/hr/?no=${item.seq}`,
    description: buildSamsungDescription(detail),
    status: 'active',
    crawledAt,
    createdAt: crawledAt,
    closedAt: null,
  };
}

export async function crawlSamsungCareers(): Promise<CrawlerSourceResult> {
  const crawledAt = new Date().toISOString();
  const jobs: CrawledJob[] = [];
  const errors: string[] = [];

  try {
    const list = await fetchSamsungList();
    const byId = new Map<string, CrawledJob>();

    for (const item of list) {
      try {
        const mapped = await toCrawledJob(item, crawledAt);
        if (mapped) byId.set(mapped.id, mapped);
      } catch (error) {
        errors.push(
          `삼성(${item.seq}): ${error instanceof Error ? error.message : '변환 실패'}`,
        );
      }
    }

    jobs.push(...byId.values());
  } catch (error) {
    errors.push(`삼성: ${error instanceof Error ? error.message : '수집 실패'}`);
  }

  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    jobs,
    errors,
  };
}

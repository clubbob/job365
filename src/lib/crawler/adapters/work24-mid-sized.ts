import { createHash } from 'node:crypto';

import { paceCrawlRequest } from '@/lib/crawler/crawl-throttle';
import {
  inferJobRoles,
  mapLocationToRegions,
  parseEmploymentTypesFromText,
} from '@/lib/crawler/map-fields';
import { getUniqueMidSizedRegistryForCrawl } from '@/lib/mid-sized-companies/registry-for-crawl';
import { normalizeBusinessNumber } from '@/lib/mid-sized-companies/registry-dedupe';
import type { CrawlerSourceResult } from '@/lib/crawler/types';
import type { CrawledJob } from '@/types/crawled-job';

const BATCH_SOURCE_ID = 'work24-mid-sized-batch';
const BATCH_SOURCE_NAME = '중견기업 고용24';
const API_BASE = 'https://www.work24.go.kr/cm/openApi/call/hr/callOpenApiSvcInfo313L01.do';

const BUSI_CONCURRENCY = Math.max(2, Number(process.env.WORK24_CONCURRENCY ?? 6) || 6);
const BULK_MAX_PAGES = Math.min(800, Number(process.env.WORK24_BULK_MAX_PAGES ?? 200) || 200);

function xmlTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  const value = match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
  return value || null;
}

function parseWork24Items(xml: string): string[] {
  return xml.match(/<wanted>[\s\S]*?<\/wanted>/gi) ?? [];
}

function parseTotalCount(xml: string): number {
  const raw = xmlTag(xml, 'total') ?? xmlTag(xml, 'totalCount');
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function normalizeBusiKey(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

function toCrawledJob(
  itemXml: string,
  companyName: string,
  sourceId: string,
  crawledAt: string,
): CrawledJob | null {
  const wantedAuthNo = xmlTag(itemXml, 'wantedAuthNo');
  const title = xmlTag(itemXml, 'wantedTitle') ?? xmlTag(itemXml, 'jobsNm');
  if (!wantedAuthNo || !title?.trim()) return null;

  const applyUrl =
    xmlTag(itemXml, 'wantedInfoUrl') ??
    xmlTag(itemXml, 'wantedMobileInfoUrl') ??
    `https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do?wantedAuthNo=${wantedAuthNo}`;
  const regionText = xmlTag(itemXml, 'workRegion') ?? xmlTag(itemXml, 'basicAddr') ?? '';
  const closeRaw = xmlTag(itemXml, 'receiptCloseDt') ?? xmlTag(itemXml, 'closeDt');
  let deadline: string | null = null;
  if (closeRaw && /^\d{8}$/.test(closeRaw)) {
    deadline = `${closeRaw.slice(0, 4)}-${closeRaw.slice(4, 6)}-${closeRaw.slice(6, 8)}`;
  }

  const empLabel = xmlTag(itemXml, 'empTpNm') ?? xmlTag(itemXml, 'holidayTpNm') ?? '';

  return {
    id: `work24-${wantedAuthNo}`,
    sourceId,
    sourceName: `${companyName} 채용 (고용24)`,
    companyName,
    title: title.trim(),
    employmentTypes: parseEmploymentTypesFromText(title, empLabel),
    roles: inferJobRoles(title),
    regions: mapLocationToRegions(regionText),
    companySize: '중견기업',
    headcount: xmlTag(itemXml, 'collectPsncnt'),
    deadline,
    applyUrl,
    description: [xmlTag(itemXml, 'jobCont'), xmlTag(itemXml, 'salTpNm'), xmlTag(itemXml, 'sal')]
      .filter(Boolean)
      .join('\n'),
    status: 'active',
    crawledAt,
    createdAt: crawledAt,
    closedAt: null,
  };
}

async function fetchWork24List(
  authKey: string,
  params: Record<string, string>,
): Promise<{ items: string[]; total: number }> {
  const url = new URL(API_BASE);
  url.searchParams.set('authKey', authKey);
  url.searchParams.set('callTp', 'L');
  url.searchParams.set('returnType', 'XML');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 JobLink365-Crawler/1.0' },
  });
  if (!res.ok) return { items: [], total: 0 };
  const xml = await res.text();
  if (!/<wanted>/i.test(xml)) {
    const apiError = xml.match(/<error>([\s\S]*?)<\/error>/i)?.[1]?.trim();
    if (apiError) {
      if (/개인회원/i.test(apiError)) {
        throw new Error(
          '고용24 OPEN-API: 개인회원은 채용정보 API를 사용할 수 없습니다. 기업회원으로 신청·승인이 필요합니다.',
        );
      }
      throw new Error(`고용24 OPEN-API: ${apiError}`);
    }
    if (/ERROR|인증|authKey/i.test(xml)) {
      throw new Error('고용24 OPEN-API 인증 또는 요청 형식 오류입니다. WORK24_AUTH_KEY를 확인해 주세요.');
    }
  }
  return { items: parseWork24Items(xml), total: parseTotalCount(xml) };
}

function buildRegistryMaps(records: ReturnType<typeof getUniqueMidSizedRegistryForCrawl>) {
  const byBusi = new Map<string, { companyName: string; crawlSourceId: string }>();
  for (const record of records) {
    const bn = normalizeBusinessNumber(record.businessNumber);
    if (!bn) continue;
    byBusi.set(bn, { companyName: record.companyName, crawlSourceId: record.crawlSourceId });
  }
  return byBusi;
}

async function crawlWork24BulkList(
  authKey: string,
  byBusi: Map<string, { companyName: string; crawlSourceId: string }>,
  crawledAt: string,
): Promise<CrawledJob[]> {
  const jobs: CrawledJob[] = [];
  let page = 1;
  let total = 0;
  while (page <= BULK_MAX_PAGES) {
    await paceCrawlRequest();
    const { items, total: reportedTotal } = await fetchWork24List(authKey, {
      startPage: String(page),
      display: '100',
    });
    if (page === 1) total = reportedTotal;
    if (items.length === 0) break;

    for (const itemXml of items) {
      const busiRaw = xmlTag(itemXml, 'busiNo') ?? xmlTag(itemXml, 'busiBusiNo');
      const bn = normalizeBusiKey(busiRaw);
      if (!bn || !byBusi.has(bn)) continue;
      const meta = byBusi.get(bn)!;
      const sourceId = `${meta.crawlSourceId}-work24-careers`;
      const job = toCrawledJob(itemXml, meta.companyName, sourceId, crawledAt);
      if (job) jobs.push(job);
    }

    if (reportedTotal > 0 && page * 100 >= reportedTotal) break;
    page += 1;
  }

  return jobs;
}

async function crawlWork24ByBusiNumbers(
  authKey: string,
  records: ReturnType<typeof getUniqueMidSizedRegistryForCrawl>,
  crawledAt: string,
): Promise<{ jobs: CrawledJob[]; queried: number; withJobs: number }> {
  const jobs: CrawledJob[] = [];
  let queried = 0;
  let withJobs = 0;
  let index = 0;

  async function worker() {
    while (index < records.length) {
      const current = index++;
      const record = records[current];
      const busiNo = normalizeBusinessNumber(record.businessNumber);
      if (!busiNo || busiNo.length < 10) continue;

      await paceCrawlRequest();
      queried += 1;
      try {
        const { items } = await fetchWork24List(authKey, {
          startPage: '1',
          display: '100',
          busiNo,
        });
        if (items.length === 0) continue;
        withJobs += 1;
        const sourceId = `${record.crawlSourceId}-work24-careers`;
        for (const itemXml of items) {
          const job = toCrawledJob(itemXml, record.companyName, sourceId, crawledAt);
          if (job) jobs.push(job);
        }
      } catch {
        // skip single company failure
      }
    }
  }

  await Promise.all(Array.from({ length: BUSI_CONCURRENCY }, () => worker()));
  return { jobs, queried, withJobs };
}

/**
 * 중견기업 명단 사업자번호로 고용24 채용정보를 조회합니다. WORK24_AUTH_KEY 필요.
 */
export async function crawlWork24MidSizedBatch(): Promise<CrawlerSourceResult> {
  const authKey = process.env.WORK24_AUTH_KEY?.trim();
  const all = getUniqueMidSizedRegistryForCrawl();
  const crawledAt = new Date().toISOString();
  const errors: string[] = [];

  if (!authKey) {
    return {
      sourceId: BATCH_SOURCE_ID,
      sourceName: BATCH_SOURCE_NAME,
      jobs: [],
      errors: [
        'WORK24_AUTH_KEY가 없습니다. work24.go.kr Open API 신청 후 .env.local에 넣으면 명단 6,732곳 사업자번호·목록 스캔이 가능합니다.',
      ],
      syncEmpty: false,
    };
  }

  const byBusi = buildRegistryMaps(all);
  const jobs: CrawledJob[] = [];

  if (process.env.WORK24_FULL_SCAN !== '0') {
    try {
      const bulkJobs = await crawlWork24BulkList(authKey, byBusi, crawledAt);
      jobs.push(...bulkJobs);
      errors.push(`고용24 목록 스캔: 공고 ${bulkJobs.length}건 (페이지 최대 ${BULK_MAX_PAGES})`);
    } catch (error) {
      errors.push(`고용24 목록 스캔 실패: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  const { jobs: busiJobs, queried, withJobs } = await crawlWork24ByBusiNumbers(authKey, all, crawledAt);
  jobs.push(...busiJobs);
  errors.unshift(
    `고용24 사업자번호 조회: ${queried}/${all.length}곳 · 공고 있는 회사 ${withJobs}곳 · 누적 공고 ${jobs.length}건`,
  );

  const jobIds = new Set<string>();
  const deduped = jobs.filter((job) => {
    if (jobIds.has(job.id)) return false;
    jobIds.add(job.id);
    return true;
  });

  return {
    sourceId: BATCH_SOURCE_ID,
    sourceName: BATCH_SOURCE_NAME,
    jobs: deduped,
    errors,
    syncEmpty: deduped.length === 0,
  };
}

export function work24MidSizedJobId(parts: string): string {
  return createHash('sha256').update(parts).digest('hex').slice(0, 24);
}

import { createHash } from 'node:crypto';

import { BROWSER_AJAX_HEADERS, BROWSER_HTML_HEADERS } from '@/lib/crawler/browser-headers';
import { crawlPageWithBrowser } from '@/lib/crawler/browser-page-crawl';
import { discoverDetailUrlPrefix, discoverPageApis } from '@/lib/crawler/discover-page-apis';
import { fetchJobDetail } from '@/lib/crawler/fetch-job-detail';
import {
  extractCandidatesFromHtmlFragment,
  getHtmlListMaxPage,
  type HtmlListCandidate,
} from '@/lib/crawler/html-list-fragment';
import { fetchJsonJobDetail, inferJsonDetailApiUrl } from '@/lib/crawler/json-job-detail';
import { fetchRecruitListCandidates, type JsonRecruitListCandidate } from '@/lib/crawler/json-list-api';
import { fetchRecruiterNoticeCandidates, type RecruiterNoticeCandidate } from '@/lib/crawler/recruiter-notice-api';
import { fetchHanwhainRecruitDetail, parseHanwhainRtSeq } from '@/lib/crawler/hanwha-career-api';
import { fetchTossCareerCandidates } from '@/lib/crawler/toss-career-api';
import { isLikelyJobPosting, isLikelyJobTitle } from '@/lib/crawler/job-heuristics';
import { isInvalidJobDescription, isInvalidJobTitle } from '@/lib/crawler/job-quality';
import { normalizeJobTitle } from '@/lib/crawler/normalize-job-title';
import {
  buildDescription,
  inferJobRoles,
  mapLocationToRegions,
  parseEmploymentTypesFromText,
  resolveCompanySize,
  textSection,
} from '@/lib/crawler/map-fields';
import type { CompanySize } from '@/lib/job-board/constants';
import { paceCrawlRequest } from '@/lib/crawler/crawl-throttle';
import { fetchText } from '@/lib/crawler/fetch-text';
import type { CrawledJob } from '@/types/crawled-job';
import type { CrawlerSourceResult } from '@/lib/crawler/types';

export type GenericHtmlConfig = {
  sourceId: string;
  sourceName: string;
  companyName: string;
  careersUrl: string;
  companySize?: CompanySize;
};

const MAX_JOBS_PER_SOURCE = 100;
const DETAIL_FETCH_CONCURRENCY = 4;

type JobCandidate = {
  title: string;
  applyUrl: string;
  companyName: string;
  dedupeKey: string;
  deadline?: string | null;
  locationHint?: string;
  roleHint?: string;
  periodHint?: string;
  detailApiUrl?: string;
  listDescription?: string;
};

function toJobCandidate(
  candidate: HtmlListCandidate | JsonRecruitListCandidate | RecruiterNoticeCandidate,
): JobCandidate {
  return {
    title: candidate.title,
    applyUrl: candidate.applyUrl,
    companyName: candidate.companyName,
    dedupeKey: candidate.dedupeKey,
    deadline: candidate.deadline,
    locationHint: candidate.locationHint,
    roleHint: candidate.roleHint,
    periodHint: candidate.periodHint,
    detailApiUrl: candidate.detailApiUrl,
    listDescription: 'listDescription' in candidate ? candidate.listDescription : undefined,
  };
}

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (!/^https?:$/i.test(resolved.protocol)) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function shortenAnchorTitle(value: string): string {
  const cleaned = cleanText(value);
  if (cleaned.length <= 120) return cleaned;

  const labeled = cleaned.match(
    /(?:^|[\s·|])(?:\[[^\]]+\]|[가-힣A-Za-z0-9()㈜\s]{4,80}?(?:채용|모집|공고)[^·|]{0,40})/,
  );
  if (labeled?.[0]) return cleanText(labeled[0]);

  const byKeyword = cleaned.match(/[가-힣A-Za-z0-9()[\]㈜\s]{8,100}?(?:채용|모집)/);
  if (byKeyword?.[0]) return cleanText(byKeyword[0]);

  return cleaned.slice(0, 120).trim();
}

function parseDeadlineFromPeriod(period: string | null | undefined): string | null {
  if (!period) return null;
  const end = period.match(/(\d{4})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/g);
  if (!end?.length) return null;
  const last = end[end.length - 1].match(/(\d{4})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/);
  if (!last) return null;
  return `${last[1]}-${last[2].padStart(2, '0')}-${last[3].padStart(2, '0')}`;
}

function getRecordTitle(record: Record<string, unknown>): string | null {
  const title = [
    record.recuNoticeNm,
    record.title,
    record.jobTitle,
    record.jobNoticeName,
    record.recruitTitle,
    record.jobOfferTitle,
    record.name,
  ].find((item) => typeof item === 'string' && item.trim().length >= 4);
  return typeof title === 'string' ? title.trim() : null;
}

function getRecordId(record: Record<string, unknown>): string | null {
  const id = [record.noticeID, record.noticeId, record.jobNoticeId, record.jobNoticeNo, record.recruitId, record.id]
    .find((item) => (typeof item === 'string' && item.trim()) || typeof item === 'number');
  if (typeof id === 'number') return String(id);
  if (typeof id === 'string' && id.trim()) return id.trim();
  return null;
}

function getRecruitKeys(record: Record<string, unknown>): { recuYy: string; recuType: string; recuCls: string } | null {
  const recuYy = typeof record.recuYy === 'string' ? record.recuYy : null;
  const recuType = typeof record.recuType === 'string' ? record.recuType : null;
  const recuCls = record.recuCls != null ? String(record.recuCls) : null;
  if (!recuYy || !recuType || !recuCls) return null;
  return { recuYy, recuType, recuCls };
}

function getRecordUrl(record: Record<string, unknown>, baseUrl: string): string | null {
  const urlValue = [record.url, record.link, record.applyUrl, record.detailUrl, record.recruitUrl]
    .find((item) => typeof item === 'string' && item.trim().length > 0);
  return typeof urlValue === 'string' ? resolveUrl(urlValue, baseUrl) : null;
}

function buildDetailUrl(prefix: string, id: string, baseUrl: string): string | null {
  return resolveUrl(`${prefix}${id}`, baseUrl);
}

function buildListDescription(candidate: JobCandidate): string {
  return buildDescription([
    textSection('회사', candidate.companyName),
    textSection('직무', candidate.roleHint),
    textSection('지역', candidate.locationHint),
    textSection('접수 기간', candidate.periodHint),
  ]);
}

function extractCandidatesFromLinks(html: string, baseUrl: string, config: GenericHtmlConfig): JobCandidate[] {
  const candidates: JobCandidate[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]?.trim();
    const title = shortenAnchorTitle(match[2] ?? '');
    if (!href || !title) continue;

    const applyUrl = resolveUrl(href, baseUrl);
    if (!applyUrl || seen.has(applyUrl)) continue;
    if (!isLikelyJobPosting(title, applyUrl, config.careersUrl)) continue;

    seen.add(applyUrl);
    candidates.push({
      title: normalizeJobTitle(title),
      applyUrl,
      companyName: config.companyName,
      dedupeKey: applyUrl,
    });
  }

  return candidates;
}

function walkJsonForCandidates(
  value: unknown,
  config: GenericHtmlConfig,
  baseUrl: string,
  candidates: JobCandidate[],
  seen: Set<string>,
  detailUrlPrefix: string | null,
): void {
  if (candidates.length >= MAX_JOBS_PER_SOURCE) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      walkJsonForCandidates(item, config, baseUrl, candidates, seen, detailUrlPrefix);
    }
    return;
  }

  if (!value || typeof value !== 'object') return;

  const record = value as Record<string, unknown>;
  const pagePath = typeof record.path === 'string' ? record.path : '';
  if (/^interview|^culture|^faq|^article|^about/i.test(pagePath)) return;

  const title = getRecordTitle(record);
  if (title && isLikelyJobTitle(title)) {
    const id = getRecordId(record);
    const recruitKeys = getRecruitKeys(record);
    const origin = new URL(baseUrl).origin;
    const applyUrl =
      getRecordUrl(record, baseUrl) ??
      (recruitKeys
        ? `${origin}/apply/applyView.hc?recuYy=${recruitKeys.recuYy}&recuType=${recruitKeys.recuType}&recuCls=${recruitKeys.recuCls}`
        : null) ??
      (id && detailUrlPrefix ? buildDetailUrl(detailUrlPrefix, id, baseUrl) : null);

    if (applyUrl && !seen.has(applyUrl)) {
      const companyName =
        (typeof record.logoNm === 'string' && record.logoNm.trim()) ||
        (typeof record.companyName === 'string' && record.companyName.trim()) ||
        (typeof record.corpName === 'string' && record.corpName.trim()) ||
        (typeof record.company === 'string' && record.company.trim()) ||
        config.companyName;

      const period =
        typeof record.start === 'string' && typeof record.end === 'string'
          ? `${record.start} ~ ${record.end}`
          : typeof record.period === 'string'
            ? record.period
            : typeof record.date === 'string'
              ? record.date
              : undefined;

      if (
        isLikelyJobPosting(title, applyUrl, config.careersUrl) ||
        (recruitKeys && isLikelyJobTitle(title)) ||
        (id && detailUrlPrefix && isLikelyJobPosting(title, applyUrl, config.careersUrl))
      ) {
        seen.add(applyUrl);
        candidates.push({
          title: normalizeJobTitle(title),
          applyUrl,
          companyName,
          dedupeKey: applyUrl,
          deadline:
            parseDeadlineFromPeriod(period) ??
            (typeof record.applyEndDt === 'string'
              ? `${record.applyEndDt.slice(0, 4)}-${record.applyEndDt.slice(4, 6)}-${record.applyEndDt.slice(6, 8)}`
              : null),
          locationHint:
            (typeof record.workPlaceCodeNm === 'string' && record.workPlaceCodeNm) ||
            (typeof record.workingArea === 'string' && record.workingArea) ||
            (typeof record.workLocationName === 'string' && record.workLocationName) ||
            (typeof record.locationName === 'string' && record.locationName) ||
            undefined,
          roleHint:
            [record.fldCodeNm, record.secCodeNm, record.channelCodeNm, record.jobRole, record.jobGroupName]
              .filter((value) => typeof value === 'string' && value.trim())
              .join(' · ') || undefined,
          periodHint: period,
          detailApiUrl: recruitKeys
            ? `${origin}/api/rec/AP-HM-FO-02820?hgrCd=1&lang=ko&recuYy=${recruitKeys.recuYy}&recuType=${recruitKeys.recuType}&recuCls=${recruitKeys.recuCls}`
            : undefined,
        });
      }
    }
  }

  for (const child of Object.values(record)) {
    walkJsonForCandidates(child, config, baseUrl, candidates, seen, detailUrlPrefix);
  }
}

function extractCandidatesFromJson(html: string, config: GenericHtmlConfig): JobCandidate[] {
  const candidates: JobCandidate[] = [];
  const seen = new Set<string>();
  const detailUrlPrefix = discoverDetailUrlPrefix(html);

  const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextData?.[1]) {
    try {
      walkJsonForCandidates(JSON.parse(nextData[1]), config, config.careersUrl, candidates, seen, detailUrlPrefix);
    } catch {
      // ignore malformed JSON
    }
  }

  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walkJsonForCandidates(JSON.parse(match[1]), config, config.careersUrl, candidates, seen, detailUrlPrefix);
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return candidates;
}

function extractCandidatesFromJsonPayloads(
  payloads: unknown[],
  config: GenericHtmlConfig,
  detailUrlPrefix: string | null,
): JobCandidate[] {
  const candidates: JobCandidate[] = [];
  const seen = new Set<string>();
  for (const payload of payloads) {
    walkJsonForCandidates(payload, config, config.careersUrl, candidates, seen, detailUrlPrefix);
  }
  return candidates;
}

function extractCandidatesFromRenderedDom(html: string, baseUrl: string, config: GenericHtmlConfig): JobCandidate[] {
  const candidates: JobCandidate[] = [];
  const seen = new Set<string>();

  for (const block of html.matchAll(/<(?:li|div|article)[^>]*class="[^"]*list-item[^"]*"[^>]*>([\s\S]*?)<\/(?:li|div|article)>/gi)) {
    const itemHtml = block[1] ?? '';
    const title = cleanText(itemHtml.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '');
    const href = itemHtml.match(/href=["']([^"']+)["']/i)?.[1];
    if (!title || !href) continue;
    const applyUrl = resolveUrl(href, baseUrl);
    if (!applyUrl || seen.has(applyUrl) || !isLikelyJobPosting(title, applyUrl, config.careersUrl)) continue;

    const companyName = cleanText(itemHtml.match(/class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '') || config.companyName;
    seen.add(applyUrl);
    candidates.push({
      title: normalizeJobTitle(title),
      applyUrl,
      companyName,
      dedupeKey: applyUrl,
      locationHint: cleanText(itemHtml.match(/class="[^"]*workingArea[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '') || undefined,
      roleHint: cleanText(itemHtml.match(/class="[^"]*jobRole[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '') || undefined,
      periodHint: cleanText(itemHtml.match(/class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '') || undefined,
      deadline: parseDeadlineFromPeriod(cleanText(itemHtml.match(/class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '')),
    });
  }

  return candidates;
}

function needsBrowserRendering(html: string, candidateCount: number, careersUrl: string): boolean {
  if (candidateCount > 0) return false;
  if (html.length < 6_000) return true;
  if (/careers\.do|\/careers(?:\/|$|\?)/i.test(careersUrl) && !/rtSeq=\d+/i.test(html)) return true;
  return (
    /\$\.post\(|fetch\(|GetRecruitList|jobNoticeList|list\.data|__NEXT_DATA__|id="countNumber">N</i.test(html) ||
    /<div class="list-item"[^>]*style="display:\s*none/i.test(html)
  );
}

function buildHtmlListPostBodies(): string[] {
  return [
    new URLSearchParams({
      currentPageNo: '1',
      intNo: '0',
      strVal: '',
      strTxt: '',
      strKey: '',
      strCompany: '',
      strType: '',
      strOrderBy: '',
      strEntity: '',
    }).toString(),
    'sort=&searchText=&corpCode=&jobRole=&recruitType=&workingType=&workingRegion=',
  ];
}

function buildHtmlListApiPaths(careersUrl: string): string[] {
  const base = new URL(careersUrl);
  const dir = base.pathname.replace(/\/?$/, '').split('/').slice(0, -1).join('/');
  return [
    '/hr/list.data',
    '/recruit/list.data',
    `${dir}/list.data`,
    '/Recruit/GetRecruitList',
  ].filter((path, index, list) => path && list.indexOf(path) === index);
}

async function fetchHtmlListPage(
  url: string,
  careersUrl: string,
  cookieHeader: string,
  body: string,
  page = 1,
): Promise<string | null> {
  const base = new URL(careersUrl);
  const postBody = body.includes('currentPageNo=')
    ? body.replace(/currentPageNo=\d+/, `currentPageNo=${page}`)
    : body;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...BROWSER_AJAX_HEADERS,
        Referer: careersUrl,
        Origin: base.origin,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: postBody,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    const text = await res.text();
    if (!text.trim()) return null;
    if (contentType.includes('json')) return null;
    if (!/<(?:h3|div)[^>]*class="[^"]*title|btnShare|<a\s/i.test(text)) return null;
    return text;
  } catch {
    return null;
  }
}

async function tryHtmlListApis(
  careersUrl: string,
  cookieHeader: string,
  config: GenericHtmlConfig,
): Promise<JobCandidate[]> {
  const candidates: JobCandidate[] = [];
  const seen = new Set<string>();

  for (const path of buildHtmlListApiPaths(careersUrl)) {
    const url = resolveUrl(path, careersUrl);
    if (!url) continue;

    for (const body of buildHtmlListPostBodies()) {
      const firstPage = await fetchHtmlListPage(url, careersUrl, cookieHeader, body, 1);
      if (!firstPage) continue;

      const pages = [firstPage];
      const maxPage = getHtmlListMaxPage(firstPage);
      for (let page = 2; page <= maxPage; page += 1) {
        const nextPage = await fetchHtmlListPage(url, careersUrl, cookieHeader, body, page);
        if (nextPage) pages.push(nextPage);
      }

      for (const fragment of pages) {
        for (const item of extractCandidatesFromHtmlFragment(
          fragment,
          careersUrl,
          config.companyName,
          config.careersUrl,
        )) {
          if (seen.has(item.dedupeKey)) continue;
          seen.add(item.dedupeKey);
          candidates.push(toJobCandidate(item));
        }
      }

      if (candidates.length > 0) return candidates;
    }
  }

  return candidates;
}

function extractCandidatesFromHtmlFragments(
  fragments: Array<{ url: string; html: string }>,
  config: GenericHtmlConfig,
): JobCandidate[] {
  const candidates: JobCandidate[] = [];
  const seen = new Set<string>();

  for (const fragment of fragments) {
    const baseUrl = fragment.url || config.careersUrl;
    for (const item of extractCandidatesFromHtmlFragment(
      fragment.html,
      baseUrl,
      config.companyName,
      config.careersUrl,
    )) {
      if (seen.has(item.dedupeKey)) continue;
      seen.add(item.dedupeKey);
      candidates.push(toJobCandidate(item));
    }
  }

  return candidates;
}

async function fetchWithSessionCookies(careersUrl: string): Promise<{ html: string; cookieHeader: string }> {
  await paceCrawlRequest();
  const res = await fetch(careersUrl, { headers: BROWSER_HTML_HEADERS, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${careersUrl}`);
  const cookieHeader = (res.headers.getSetCookie?.() ?? []).map((item) => item.split(';')[0]).join('; ');
  return { html: await res.text(), cookieHeader };
}

async function tryDiscoveredApis(
  careersUrl: string,
  html: string,
  cookieHeader: string,
  config: GenericHtmlConfig,
): Promise<JobCandidate[]> {
  const detailUrlPrefix = discoverDetailUrlPrefix(html);
  const payloads: unknown[] = [];
  const htmlCandidates: JobCandidate[] = [];
  const base = new URL(careersUrl);

  for (const api of discoverPageApis(html)) {
    const url = resolveUrl(api.path, careersUrl);
    if (!url) continue;

    try {
      const res = await fetch(url, {
        method: api.method,
        headers: {
          ...BROWSER_AJAX_HEADERS,
          Referer: careersUrl,
          Origin: base.origin,
          ...(api.method === 'POST'
            ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
            : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body:
          api.method === 'POST'
            ? 'sort=&searchText=&corpCode=&jobRole=&recruitType=&workingType=&workingRegion='
            : undefined,
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('json')) {
        payloads.push(await res.json());
        continue;
      }

      const text = await res.text();
      if (/<(?:h3|div)[^>]*class="[^"]*title|btnShare|<a\s/i.test(text)) {
        for (const item of extractCandidatesFromHtmlFragment(
          text,
          url,
          config.companyName,
          config.careersUrl,
        )) {
          htmlCandidates.push(toJobCandidate(item));
        }
      }
    } catch {
      // 다음 엔드포인트 시도
    }
  }

  return [
    ...extractCandidatesFromJsonPayloads(payloads, config, detailUrlPrefix),
    ...htmlCandidates,
  ];
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function buildJobsFromCandidates(
  config: GenericHtmlConfig,
  candidates: JobCandidate[],
  crawledAt: string,
): Promise<CrawledJob[]> {
  const limited = candidates.slice(0, MAX_JOBS_PER_SOURCE);

  const jobs: CrawledJob[] = [];

  await mapWithConcurrency(limited, DETAIL_FETCH_CONCURRENCY, async (candidate) => {
    const hasListDescription =
      candidate.listDescription && !isInvalidJobDescription(candidate.listDescription);
    const hanwhainRtSeq = hasListDescription ? null : parseHanwhainRtSeq(candidate.applyUrl);
    const jsonDetailUrl = hasListDescription
      ? null
      : candidate.detailApiUrl ?? inferJsonDetailApiUrl(candidate.applyUrl);
    const jsonDetail = hanwhainRtSeq
      ? await fetchHanwhainRecruitDetail(hanwhainRtSeq, candidate.applyUrl)
      : jsonDetailUrl
        ? await fetchJsonJobDetail(jsonDetailUrl, config.careersUrl)
        : null;
    const htmlDetail =
      hasListDescription || jsonDetail ? null : await fetchJobDetail(candidate.applyUrl, config.careersUrl);
    const detail = jsonDetail ?? htmlDetail;
    const title = normalizeJobTitle(detail?.title ?? candidate.title);
    if (isInvalidJobTitle(title)) return;
    const companyName = detail?.companyName ?? candidate.companyName;
    const description =
      candidate.listDescription && !isInvalidJobDescription(candidate.listDescription)
        ? candidate.listDescription
        : detail && !isInvalidJobDescription(detail.description)
          ? detail.description
          : buildListDescription(candidate);
    if (isInvalidJobDescription(description)) return;

    const locationSource = `${candidate.locationHint ?? ''} ${title}`;
    jobs.push({
      id: `${config.sourceId}-${hashUrl(candidate.dedupeKey)}`,
      sourceId: config.sourceId,
      sourceName: config.sourceName,
      companyName,
      title,
      employmentTypes: parseEmploymentTypesFromText(`${title} ${candidate.roleHint ?? ''}`),
      roles: inferJobRoles(title, candidate.roleHint),
      regions: mapLocationToRegions(locationSource),
      companySize: resolveCompanySize(companyName, config.companySize),
      headcount: detail?.headcount ?? null,
      deadline: detail?.deadline ?? candidate.deadline ?? null,
      applyUrl: candidate.applyUrl,
      description,
      status: 'active',
      crawledAt,
      createdAt: crawledAt,
      closedAt: null,
    });
  });

  return jobs;
}

export async function crawlGenericHtmlCareers(config: GenericHtmlConfig): Promise<CrawlerSourceResult> {
  const errors: string[] = [];
  const crawledAt = new Date().toISOString();

  try {
    const { html: initialHtml, cookieHeader } = await fetchWithSessionCookies(config.careersUrl);
    let html = initialHtml;

    let candidates = [
      ...extractCandidatesFromJson(html, config),
      ...extractCandidatesFromLinks(html, config.careersUrl, config),
      ...(await fetchRecruitListCandidates(config.careersUrl, config.companyName)).map(toJobCandidate),
      ...(await fetchRecruiterNoticeCandidates(config.careersUrl, config.companyName)).map(toJobCandidate),
      ...(await fetchTossCareerCandidates(config.careersUrl)).map(toJobCandidate),
      ...await tryHtmlListApis(config.careersUrl, cookieHeader, config),
      ...await tryDiscoveredApis(config.careersUrl, html, cookieHeader, config),
    ];

    if (needsBrowserRendering(html, candidates.length, config.careersUrl)) {
      try {
        const rendered = await crawlPageWithBrowser(config.careersUrl);
        html = rendered.html;
        candidates = [
          ...candidates,
          ...extractCandidatesFromJsonPayloads(rendered.jsonPayloads, config, discoverDetailUrlPrefix(html)),
          ...extractCandidatesFromHtmlFragments(rendered.htmlFragments, config),
          ...extractCandidatesFromRenderedDom(rendered.html, config.careersUrl, config),
          ...extractCandidatesFromLinks(rendered.html, config.careersUrl, config),
        ];
      } catch (error) {
        errors.push(
          `${config.companyName}: JavaScript 렌더링 수집 실패 (${error instanceof Error ? error.message : '알 수 없음'})`,
        );
      }
    }

    const deduped = candidates.filter(
      (item, index, list) => list.findIndex((row) => row.dedupeKey === item.dedupeKey) === index,
    );

    const jobs = await buildJobsFromCandidates(config, deduped, crawledAt);

    if (jobs.length === 0) {
      errors.push(`${config.companyName}: 상세 내용을 확인할 수 있는 채용 공고를 찾지 못했습니다.`);
    }

    return {
      sourceId: config.sourceId,
      sourceName: config.sourceName,
      jobs,
      errors,
      syncEmpty: true,
    };
  } catch (error) {
    errors.push(`${config.companyName}: ${error instanceof Error ? error.message : '수집 실패'}`);
    return {
      sourceId: config.sourceId,
      sourceName: config.sourceName,
      jobs: [],
      errors,
    };
  }
}

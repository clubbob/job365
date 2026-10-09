import type { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  JOB_REGIONS,
  JOB_ROLES,
  isCompanySize,
  isEmploymentType,
  isJobRegion,
  isJobRole,
} from '@/lib/job-board/constants';
import { ADMIN_CRAWLED_JOBS_PAGE_SIZE } from '@/lib/admin-constants';
import { SAMPLE_CRAWLED_JOBS } from '@/lib/job-board/sample-jobs';
import { getDisplayDisabledCompanyKeys, isCompanyCrawlDisabled } from '@/lib/crawl-company-policy-server';
import { getDisplayDisabledSourceIds, isDisplayDisabled } from '@/lib/crawl-source-policy-server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { isBrowsableCrawledJob, shouldPersistCrawledJob } from '@/lib/crawler/job-quality';
import { matchesCrawledJobKeyword } from '@/lib/job-board/match';
import type {
  CrawledJob,
  CrawledJobListItem,
  CrawledJobStatus,
  DiscoveredAffiliate,
} from '@/types/crawled-job';

const COLLECTION = 'crawledJobs';
/** 사용자 목록·검색용 노출 가능 공고 캐시 TTL */
const LIST_CACHE_TTL_MS = 120_000;
/** 첫 페이지만 최근 active 문서를 소량 읽어 노출 공고를 채움 */
const BROWSABLE_WINDOW_BATCH_SIZE = 48;
const BROWSABLE_WINDOW_MAX_SCAN = 400;
/** 관리자 목록 조회 시 description 등 대용량 필드 제외 */
const ADMIN_LIST_SELECT_FIELDS = [
  'companyName',
  'title',
  'sourceId',
  'sourceName',
  'employmentTypes',
  'roles',
  'regions',
  'companySize',
  'headcount',
  'deadline',
  'applyUrl',
  'status',
  'crawledAt',
  'createdAt',
  'closedAt',
] as const;

let listCache: { expiresAt: number; items: CrawledJobListItem[] } | null = null;
let browsableJobsCache: { expiresAt: number; jobs: CrawledJob[] } | null = null;
let browsableLoadPromise: Promise<CrawledJob[]> | null = null;
let adminFullListCache: { expiresAt: number; jobs: CrawledJob[] } | null = null;
let adminFullListLoadPromise: Promise<CrawledJob[]> | null = null;
let adminJobsByStatusCache: Partial<
  Record<CrawledJobStatus, { expiresAt: number; jobs: CrawledJob[] }>
> = {};
let adminJobsByStatusLoadPromise: Partial<Record<CrawledJobStatus, Promise<CrawledJob[]>>> = {};

export function invalidateCrawledJobsListCache(): void {
  listCache = null;
  browsableJobsCache = null;
  browsableLoadPromise = null;
  adminFullListCache = null;
  adminFullListLoadPromise = null;
  adminJobsByStatusCache = {};
  adminJobsByStatusLoadPromise = {};
  sourceStatsCache = null;
  browsableStatusCreatedAtIndexReady = null;
  void import('@/lib/job-companies-server')
    .then((mod) => mod.invalidateJobCompaniesPayloadCache())
    .catch(() => undefined);
}

async function filterDisplayableJobs<T extends { sourceId: string; companyName: string }>(
  jobs: T[],
): Promise<T[]> {
  const [hiddenSources, hiddenCompanies] = await Promise.all([
    getDisplayDisabledSourceIds(),
    getDisplayDisabledCompanyKeys(),
  ]);
  if (hiddenSources.size === 0 && hiddenCompanies.size === 0) return jobs;

  return jobs.filter((job) => {
    if (hiddenSources.has(job.sourceId)) return false;
    const companyKey = `${job.sourceId}::${job.companyName.trim()}`;
    return !hiddenCompanies.has(companyKey);
  });
}

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  return null;
}

function parseStringArray<T extends string>(
  value: unknown,
  guard: (item: string) => item is T,
): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is T => typeof item === 'string' && guard(item));
}

function fromDoc(id: string, data: DocumentData): CrawledJob | null {
  const companyName = typeof data.companyName === 'string' ? data.companyName.trim() : '';
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const sourceId = typeof data.sourceId === 'string' ? data.sourceId.trim() : '';
  const sourceName = typeof data.sourceName === 'string' ? data.sourceName.trim() : '';
  const applyUrl = typeof data.applyUrl === 'string' ? data.applyUrl.trim() : '';
  const companySizeRaw = typeof data.companySize === 'string' ? data.companySize : '';
  const statusRaw = typeof data.status === 'string' ? data.status : 'active';

  if (!companyName || !title || !sourceId || !sourceName || !applyUrl || !isCompanySize(companySizeRaw)) {
    return null;
  }

  const crawledAt = serializeTimestamp(data.crawledAt) ?? serializeTimestamp(data.createdAt);
  const createdAt = serializeTimestamp(data.createdAt) ?? crawledAt;
  if (!crawledAt || !createdAt) return null;

  const status: CrawledJobStatus = statusRaw === 'closed' ? 'closed' : 'active';

  return {
    id,
    sourceId,
    sourceName,
    companyName,
    title,
    employmentTypes: parseStringArray(data.employmentTypes, isEmploymentType),
    roles: parseStringArray(data.roles, isJobRole),
    regions: parseStringArray(data.regions, isJobRegion),
    companySize: companySizeRaw,
    headcount:
      typeof data.headcount === 'string' && data.headcount.trim() ? data.headcount.trim() : null,
    deadline: typeof data.deadline === 'string' ? data.deadline : null,
    applyUrl,
    description: typeof data.description === 'string' ? data.description : '',
    status,
    crawledAt,
    createdAt,
    closedAt: serializeTimestamp(data.closedAt),
  };
}

function toListItem(job: CrawledJob): CrawledJobListItem {
  const {
    id,
    sourceName,
    companyName,
    title,
    employmentTypes,
    roles,
    regions,
    companySize,
    deadline,
    applyUrl,
    status,
    crawledAt,
    createdAt,
  } = job;
  return {
    id,
    sourceName,
    companyName,
    title,
    employmentTypes,
    roles,
    regions,
    companySize,
    deadline,
    applyUrl,
    status,
    crawledAt,
    createdAt,
  };
}

async function filterBrowsableJobs(jobs: CrawledJob[]): Promise<CrawledJob[]> {
  const active = jobs.filter((job) => job.status === 'active' && isBrowsableCrawledJob(job));
  return filterDisplayableJobs(active);
}

function isFirestoreIndexError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: number | string }).code;
  if (code === 9 || code === 'failed-precondition') return true;
  const message = String((error as { message?: string }).message ?? '');
  const details = String((error as { details?: string }).details ?? '');
  return message.includes('requires an index') || details.includes('requires an index');
}

/** status+createdAt 복합 인덱스 없으면 윈도우 쿼리를 건너뜁니다 */
let browsableStatusCreatedAtIndexReady: boolean | null = null;

function isJobVisibleOnBoard(
  job: CrawledJob,
  hiddenSources: Set<string>,
  hiddenCompanies: Set<string>,
): boolean {
  if (!isBrowsableCrawledJob(job)) return false;
  if (hiddenSources.has(job.sourceId)) return false;
  const companyKey = `${job.sourceId}::${job.companyName.trim()}`;
  return !hiddenCompanies.has(companyKey);
}

/**
 * 전체 active 스캔 없이 최근 순으로 일부만 읽어 페이지를 채웁니다 (메인·첫 페이지용).
 */
/**
 * 복합 인덱스 없을 때: createdAt만 정렬해 최근 문서를 읽고 active·노출 가능 공고만 채웁니다.
 */
async function listBrowsableJobsByCreatedAtScan(
  page: number,
  pageSize: number,
): Promise<{ items: CrawledJobListItem[]; total: number }> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 50));
  const start = (safePage - 1) * safePageSize;
  const targetEnd = safePage * safePageSize;

  const [hiddenSources, hiddenCompanies, countSnap] = await Promise.all([
    getDisplayDisabledSourceIds(),
    getDisplayDisabledCompanyKeys(),
    db.collection(COLLECTION).where('status', '==', 'active').count().get(),
  ]);

  const collected: CrawledJob[] = [];
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let scanned = 0;

  while (collected.length < targetEnd && scanned < BROWSABLE_WINDOW_MAX_SCAN) {
    let query = db
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(BROWSABLE_WINDOW_BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snap = await query.get();
    if (snap.empty) break;

    scanned += snap.docs.length;
    for (const doc of snap.docs) {
      const job = fromDoc(doc.id, doc.data());
      if (!job || job.status !== 'active') continue;
      if (!isJobVisibleOnBoard(job, hiddenSources, hiddenCompanies)) continue;
      collected.push(job);
    }

    lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.docs.length < BROWSABLE_WINDOW_BATCH_SIZE) break;
  }

  const activeTotal = countSnap.data().count;
  return {
    items: collected.slice(start, start + safePageSize).map(toListItem),
    total: Math.max(collected.length, activeTotal),
  };
}

async function listBrowsableJobsWindow(
  page: number,
  pageSize: number,
): Promise<{ items: CrawledJobListItem[]; total: number }> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 50));
  const targetEnd = safePage * safePageSize;
  const start = (safePage - 1) * safePageSize;

  if (browsableStatusCreatedAtIndexReady === false) {
    return listBrowsableJobsByCreatedAtScan(page, pageSize);
  }

  try {
    const [hiddenSources, hiddenCompanies, countSnap] = await Promise.all([
      getDisplayDisabledSourceIds(),
      getDisplayDisabledCompanyKeys(),
      db.collection(COLLECTION).where('status', '==', 'active').count().get(),
    ]);

    const collected: CrawledJob[] = [];
    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    let scanned = 0;

    while (collected.length < targetEnd && scanned < BROWSABLE_WINDOW_MAX_SCAN) {
      let query = db
        .collection(COLLECTION)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(BROWSABLE_WINDOW_BATCH_SIZE);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snap = await query.get();
      if (snap.empty) break;

      scanned += snap.docs.length;
      for (const doc of snap.docs) {
        const job = fromDoc(doc.id, doc.data());
        if (!job || !isJobVisibleOnBoard(job, hiddenSources, hiddenCompanies)) continue;
        collected.push(job);
      }

      lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      if (snap.docs.length < BROWSABLE_WINDOW_BATCH_SIZE) break;
    }

    const activeTotal = countSnap.data().count;
    const items = collected.slice(start, start + safePageSize).map(toListItem);
    const total =
      collected.length >= targetEnd || scanned >= BROWSABLE_WINDOW_MAX_SCAN
        ? Math.max(collected.length, activeTotal)
        : collected.length;

    browsableStatusCreatedAtIndexReady = true;
    return { items, total };
  } catch (error) {
    if (!isFirestoreIndexError(error)) throw error;
    browsableStatusCreatedAtIndexReady = false;
    console.warn(
      '[crawled-jobs] browsable window needs status+createdAt index; using createdAt scan (deploy firestore.indexes.json to speed up)',
    );
    return listBrowsableJobsByCreatedAtScan(page, pageSize);
  }
}

async function listFromFirestore(): Promise<CrawledJob[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((item): item is CrawledJob => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 모집 중 공고만 조회 (마감·전체 스캔보다 작음) */
async function listActiveFromFirestore(): Promise<CrawledJob[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).where('status', '==', 'active').get();
  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((item): item is CrawledJob => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 사용자 채용 목록·필터 검색용 (캐시·동시 요청 합침) */
async function getBrowsableCrawledJobs(): Promise<CrawledJob[]> {
  if (browsableJobsCache && browsableJobsCache.expiresAt > Date.now()) {
    return browsableJobsCache.jobs;
  }
  if (browsableLoadPromise) {
    return browsableLoadPromise;
  }

  browsableLoadPromise = (async () => {
    const jobs = await filterBrowsableJobs(await listActiveFromFirestore());
    const expiresAt = Date.now() + LIST_CACHE_TTL_MS;
    browsableJobsCache = { expiresAt, jobs };
    listCache = { expiresAt, items: jobs.map(toListItem) };
    return jobs;
  })();

  try {
    return await browsableLoadPromise;
  } finally {
    browsableLoadPromise = null;
  }
}

/** 관리자 검색: 전체 수집 공고를 한 번 읽어 메모리에서 제목·회사 등으로 필터 */
async function listAllCrawledJobsForAdminSearch(): Promise<CrawledJob[]> {
  if (adminFullListCache && adminFullListCache.expiresAt > Date.now()) {
    return adminFullListCache.jobs;
  }
  if (adminFullListLoadPromise) {
    return adminFullListLoadPromise;
  }

  adminFullListLoadPromise = (async () => {
    const jobs = await listFromFirestore();
    adminFullListCache = { expiresAt: Date.now() + LIST_CACHE_TTL_MS, jobs };
    return jobs;
  })();

  try {
    return await adminFullListLoadPromise;
  } finally {
    adminFullListLoadPromise = null;
  }
}

async function listBrowsableFromFirestore(): Promise<CrawledJob[]> {
  return getBrowsableCrawledJobs();
}

function shouldUseSampleFallback(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.CRAWLER_USE_SAMPLES !== 'false';
}

async function listAllCrawledJobsForAggregation(): Promise<CrawledJob[]> {
  try {
    const jobs = await listFromFirestore();
    if (jobs.length > 0) return jobs;
    if (!shouldUseSampleFallback()) return [];
  } catch (error) {
    console.warn('[crawled-jobs] aggregation list failed', error);
    if (!shouldUseSampleFallback()) return [];
  }

  return SAMPLE_CRAWLED_JOBS;
}

export type CrawledJobSourceStats = {
  jobCountsBySource: Record<string, number>;
  discoveredBySource: Record<string, DiscoveredAffiliate[]>;
};

let sourceStatsCache: { expiresAt: number; data: CrawledJobSourceStats; key: string } | null = null;
const SOURCE_STATS_TTL_MS = 60_000;

const SOURCE_STATS_SELECT_FIELDS = ['sourceId', 'companyName', 'status'] as const;

function buildSourceStatsFromActiveRows(rows: Array<{ sourceId: string; companyName: string }>): CrawledJobSourceStats {
  const jobCountsBySource: Record<string, number> = {};
  const bySource = new Map<string, Map<string, number>>();

  for (const row of rows) {
    jobCountsBySource[row.sourceId] = (jobCountsBySource[row.sourceId] ?? 0) + 1;

    if (!bySource.has(row.sourceId)) bySource.set(row.sourceId, new Map());
    const companies = bySource.get(row.sourceId)!;
    companies.set(row.companyName, (companies.get(row.companyName) ?? 0) + 1);
  }

  const discoveredBySource: Record<string, DiscoveredAffiliate[]> = {};
  for (const [sourceId, companies] of bySource) {
    discoveredBySource[sourceId] = [...companies.entries()]
      .map(([companyName, activeJobCount]) => ({ companyName, activeJobCount }))
      .sort((a, b) => a.companyName.localeCompare(b.companyName, 'ko'));
  }

  return { jobCountsBySource, discoveredBySource };
}

function buildSourceStats(jobs: CrawledJob[]): CrawledJobSourceStats {
  return buildSourceStatsFromActiveRows(
    jobs
      .filter((job) => job.status === 'active')
      .map((job) => ({ sourceId: job.sourceId, companyName: job.companyName.trim() }))
      .filter((row) => row.companyName),
  );
}

async function listActiveJobRowsForSourceStats(): Promise<Array<{ sourceId: string; companyName: string }>> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'active')
    .select(...SOURCE_STATS_SELECT_FIELDS)
    .get();

  const rows: Array<{ sourceId: string; companyName: string }> = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const sourceId = typeof data.sourceId === 'string' ? data.sourceId.trim() : '';
    const companyName = typeof data.companyName === 'string' ? data.companyName.trim() : '';
    if (sourceId && companyName) rows.push({ sourceId, companyName });
  }
  return rows;
}

/** 채용 사이트별 공고 건수·계열사를 한 번의 조회로 집계합니다. */
export async function getCrawledJobSourceStats(options?: {
  skipDisplayFilters?: boolean;
}): Promise<CrawledJobSourceStats> {
  const cacheKey = options?.skipDisplayFilters ? 'all' : 'visible';
  if (sourceStatsCache && sourceStatsCache.expiresAt > Date.now() && sourceStatsCache.key === cacheKey) {
    return sourceStatsCache.data;
  }

  let rows: Array<{ sourceId: string; companyName: string }>;
  try {
    rows = await listActiveJobRowsForSourceStats();
  } catch (error) {
    console.warn('[crawled-jobs] source stats select query failed, falling back to full scan', error);
    const allJobs = (await listAllCrawledJobsForAggregation()).filter((job) => job.status === 'active');
    const jobs = options?.skipDisplayFilters ? allJobs : await filterDisplayableJobs(allJobs);
    const data = buildSourceStats(jobs);
    sourceStatsCache = { expiresAt: Date.now() + SOURCE_STATS_TTL_MS, data, key: cacheKey };
    return data;
  }
  if (!options?.skipDisplayFilters) {
    const [hiddenSources, hiddenCompanies] = await Promise.all([
      getDisplayDisabledSourceIds(),
      getDisplayDisabledCompanyKeys(),
    ]);
    if (hiddenSources.size > 0 || hiddenCompanies.size > 0) {
      rows = rows.filter((row) => {
        if (hiddenSources.has(row.sourceId)) return false;
        const companyKey = `${row.sourceId}::${row.companyName}`;
        return !hiddenCompanies.has(companyKey);
      });
    }
  }
  const data = buildSourceStatsFromActiveRows(rows);
  sourceStatsCache = { expiresAt: Date.now() + SOURCE_STATS_TTL_MS, data, key: cacheKey };
  return data;
}

/** 채용 사이트(sourceId)별 active 공고 건수 */
export async function countActiveJobsBySource(): Promise<Record<string, number>> {
  const { jobCountsBySource } = await getCrawledJobSourceStats();
  return jobCountsBySource;
}

/** 채용 사이트(sourceId)별 active 공고에서 확인된 모집 회사(계열사) 목록 */
export async function listDiscoveredAffiliatesBySource(): Promise<Record<string, DiscoveredAffiliate[]>> {
  const { discoveredBySource } = await getCrawledJobSourceStats();
  return discoveredBySource;
}

export type AdminCrawledJobRow = CrawledJobListItem & {
  sourceId: string;
  displayHidden: boolean;
};

export type AdminCrawledJobsStatusFilter = 'all' | CrawledJobStatus;

export type AdminCrawledJobsPageResult = {
  jobs: AdminCrawledJobRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function toAdminCrawledJobRow(job: CrawledJob, hidden: Set<string>): AdminCrawledJobRow {
  return {
    ...toListItem(job),
    sourceId: job.sourceId,
    displayHidden: hidden.has(job.sourceId),
  };
}

function matchesAdminCrawledJobQuery(job: CrawledJob, q: string): boolean {
  return matchesCrawledJobKeyword(job, q);
}

function paginateAdminCrawledJobs(
  jobs: CrawledJob[],
  hidden: Set<string>,
  page: number,
  pageSize: number,
): AdminCrawledJobsPageResult {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, ADMIN_CRAWLED_JOBS_PAGE_SIZE));
  const total = jobs.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const start = (safePage - 1) * safePageSize;

  return {
    jobs: jobs.slice(start, start + safePageSize).map((job) => toAdminCrawledJobRow(job, hidden)),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

function filterAdminCrawledJobs(
  jobs: CrawledJob[],
  status: AdminCrawledJobsStatusFilter,
  q: string,
): CrawledJob[] {
  return jobs
    .filter((job) => status === 'all' || job.status === status)
    .filter((job) => matchesAdminCrawledJobQuery(job, q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function jobsFromQueryDocs(docs: QueryDocumentSnapshot[]): CrawledJob[] {
  return docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((item): item is CrawledJob => Boolean(item));
}

/** 인덱스 없을 때만: status별 전체를 select로 한 번 읽고 캐시 (검색·폴백용) */
async function listCrawledJobsByStatusForAdminCache(status: CrawledJobStatus): Promise<CrawledJob[]> {
  const cached = adminJobsByStatusCache[status];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.jobs;
  }

  const inFlight = adminJobsByStatusLoadPromise[status];
  if (inFlight) return inFlight;

  const load = (async () => {
    const db = getAdminFirestore();
    if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

    const snap = await db
      .collection(COLLECTION)
      .where('status', '==', status)
      .select(...ADMIN_LIST_SELECT_FIELDS)
      .get();

    const jobs = jobsFromQueryDocs(snap.docs).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    adminJobsByStatusCache[status] = { expiresAt: Date.now() + LIST_CACHE_TTL_MS, jobs };
    return jobs;
  })();

  adminJobsByStatusLoadPromise[status] = load;
  try {
    return await load;
  } finally {
    delete adminJobsByStatusLoadPromise[status];
  }
}

async function listAdminCrawledJobsByStatusPaged(
  status: CrawledJobStatus,
  page: number,
  pageSize: number,
): Promise<{ jobs: CrawledJob[]; total: number }> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, ADMIN_CRAWLED_JOBS_PAGE_SIZE));
  const offset = (safePage - 1) * safePageSize;
  const collection = db.collection(COLLECTION);
  const filtered = collection.where('status', '==', status);

  try {
    const [totalSnap, pageSnap] = await Promise.all([
      filtered.count().get(),
      filtered
        .orderBy('createdAt', 'desc')
        .select(...ADMIN_LIST_SELECT_FIELDS)
        .limit(offset + safePageSize)
        .get(),
    ]);

    const total = totalSnap.data().count;
    const jobs = jobsFromQueryDocs(pageSnap.docs.slice(offset));
    return { jobs, total };
  } catch (error) {
    if (!isFirestoreIndexError(error)) throw error;
    console.warn(
      '[crawled-jobs] admin status page needs composite index, using cached status scan',
      error,
    );
    const all = await listCrawledJobsByStatusForAdminCache(status);
    return { jobs: all.slice(offset, offset + safePageSize), total: all.length };
  }
}

/** 관리자용: 기본 모집 중·50건 페이지네이션. 검색어가 있으면 메모리 필터 후 페이지네이션 */
export async function listCrawledJobsForAdminPage(
  page: number,
  pageSize: number,
  status: AdminCrawledJobsStatusFilter = 'active',
  q = '',
): Promise<AdminCrawledJobsPageResult> {
  const hidden = await getDisplayDisabledSourceIds();
  const trimmedQ = q.trim();
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, ADMIN_CRAWLED_JOBS_PAGE_SIZE));

  if (trimmedQ) {
    try {
      const source =
        status === 'active' || status === 'closed'
          ? await listCrawledJobsByStatusForAdminCache(status)
          : await listAllCrawledJobsForAdminSearch();
      const jobs = filterAdminCrawledJobs(source, status, trimmedQ);
      if (jobs.length > 0 || !shouldUseSampleFallback()) {
        return paginateAdminCrawledJobs(jobs, hidden, safePage, safePageSize);
      }
    } catch (error) {
      console.warn('[crawled-jobs] admin search list failed', error);
      if (!shouldUseSampleFallback()) throw error;
    }

    return paginateAdminCrawledJobs(
      filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, trimmedQ),
      hidden,
      safePage,
      safePageSize,
    );
  }

  const db = getAdminFirestore();
  if (!db) {
    if (!shouldUseSampleFallback()) {
      return { jobs: [], total: 0, page: safePage, pageSize: safePageSize, totalPages: 1 };
    }
    return paginateAdminCrawledJobs(filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, ''), hidden, safePage, safePageSize);
  }

  try {
    const collection = db.collection(COLLECTION);

    if (status === 'all') {
      const offset = (safePage - 1) * safePageSize;
      const [totalSnap, pageSnap] = await Promise.all([
        collection.count().get(),
        collection
          .orderBy('createdAt', 'desc')
          .select(...ADMIN_LIST_SELECT_FIELDS)
          .limit(offset + safePageSize)
          .get(),
      ]);

      const total = totalSnap.data().count;

      if (total === 0 && shouldUseSampleFallback()) {
        return paginateAdminCrawledJobs(filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, ''), hidden, safePage, safePageSize);
      }

      const jobs = jobsFromQueryDocs(pageSnap.docs.slice(offset)).map((job) =>
        toAdminCrawledJobRow(job, hidden),
      );

      return {
        jobs,
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      };
    }

    const { jobs: statusJobs, total } = await listAdminCrawledJobsByStatusPaged(
      status,
      safePage,
      safePageSize,
    );

    if (statusJobs.length === 0 && total === 0 && shouldUseSampleFallback()) {
      return paginateAdminCrawledJobs(filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, ''), hidden, safePage, safePageSize);
    }

    return {
      jobs: statusJobs.map((job) => toAdminCrawledJobRow(job, hidden)),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  } catch (error) {
    console.warn('[crawled-jobs] admin paged list failed', error);
    if (!shouldUseSampleFallback()) throw error;

    return paginateAdminCrawledJobs(filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, ''), hidden, safePage, safePageSize);
  }
}

export async function closeCrawledJobById(id: string): Promise<boolean> {
  const closedAt = new Date().toISOString();
  const closed = await markCrawledJobsClosed([id], closedAt);
  if (closed > 0) {
    invalidateCrawledJobsListCache();
    return true;
  }
  return false;
}

export async function listCrawledJobs(): Promise<CrawledJobListItem[]> {
  if (listCache && listCache.expiresAt > Date.now()) {
    return listCache.items;
  }

  try {
    const jobs = await getBrowsableCrawledJobs();
    if (jobs.length > 0) {
      return listCache?.items ?? jobs.map(toListItem);
    }
    if (!shouldUseSampleFallback()) return [];
  } catch (error) {
    console.warn('[crawled-jobs] Firestore list failed', error);
    if (!shouldUseSampleFallback()) throw error;
  }

  const items = SAMPLE_CRAWLED_JOBS.map(toListItem);
  listCache = { expiresAt: Date.now() + LIST_CACHE_TTL_MS, items };
  return items;
}

export async function countActiveCrawledJobs(): Promise<number> {
  try {
    const db = getAdminFirestore();
    if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

    const snap = await db.collection(COLLECTION).where('status', '==', 'active').count().get();
    return snap.data().count;
  } catch (error) {
    console.warn('[crawled-jobs] active count failed, falling back to full list', error);
    const all = await listCrawledJobs();
    return all.filter((job) => job.status === 'active').length;
  }
}

/** 필터 없는 목록: 페이지당 pageSize개만 조회 */
export async function listActiveCrawledJobsPage(
  page: number,
  pageSize: number,
): Promise<{ items: CrawledJobListItem[]; total: number }> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 50));
  const start = (safePage - 1) * safePageSize;

  try {
    if (browsableJobsCache && browsableJobsCache.expiresAt > Date.now()) {
      const jobs = browsableJobsCache.jobs;
      return {
        items: jobs.slice(start, start + safePageSize).map(toListItem),
        total: jobs.length,
      };
    }

    if (safePageSize <= 24) {
      return await listBrowsableJobsWindow(safePage, safePageSize);
    }

    const browsable = await getBrowsableCrawledJobs();
    const items = browsable.slice(start, start + safePageSize).map(toListItem);

    return { items, total: browsable.length };
  } catch (error) {
    console.warn('[crawled-jobs] paged list failed, falling back to full list', error);
    const all = await listCrawledJobs();
    const active = all.filter((job) => job.status === 'active');
    return {
      items: active.slice(start, start + safePageSize),
      total: active.length,
    };
  }
}

export async function getCrawledJob(id: string): Promise<CrawledJob | null> {
  const db = getAdminFirestore();
  if (db) {
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (snap.exists) {
      const parsed = fromDoc(snap.id, snap.data() ?? {});
      if (parsed && isBrowsableCrawledJob(parsed) && parsed.status === 'active') {
        if (await isDisplayDisabled(parsed.sourceId)) return null;
        return parsed;
      }
    }
  }

  if (!shouldUseSampleFallback()) return null;
  return SAMPLE_CRAWLED_JOBS.find((job) => job.id === id) ?? null;
}

export async function getCrawledJobForAdmin(id: string): Promise<CrawledJob | null> {
  const db = getAdminFirestore();
  if (!db) return null;

  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;

  const parsed = fromDoc(snap.id, snap.data() ?? {});
  return parsed ?? null;
}

function jobContentSnapshot(job: CrawledJob): string {
  return JSON.stringify({
    sourceId: job.sourceId,
    sourceName: job.sourceName,
    companyName: job.companyName,
    title: job.title,
    employmentTypes: job.employmentTypes,
    roles: job.roles,
    regions: job.regions,
    companySize: job.companySize,
    headcount: job.headcount,
    deadline: job.deadline,
    applyUrl: job.applyUrl,
    description: job.description,
    status: job.status,
    closedAt: job.closedAt,
  });
}

export type UpsertCrawledJobResult = 'created' | 'updated' | 'unchanged';

export async function upsertCrawledJob(job: CrawledJob): Promise<UpsertCrawledJobResult> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const ref = db.collection(COLLECTION).doc(job.id);
  const existing = await ref.get();
  const existingJob = existing.exists ? fromDoc(ref.id, existing.data() ?? {}) : null;

  if (existingJob && jobContentSnapshot(existingJob) === jobContentSnapshot(job)) {
    return 'unchanged';
  }

  if (!shouldPersistCrawledJob(job)) {
    return 'unchanged';
  }

  if (await isCompanyCrawlDisabled(job.sourceId, job.companyName)) {
    return 'unchanged';
  }

  const createdAt = existingJob?.createdAt ?? job.createdAt;

  await ref.set({
    ...job,
    createdAt,
    employmentTypes: job.employmentTypes.filter(isEmploymentType),
    roles: job.roles.filter(isJobRole),
    regions: job.regions.filter(isJobRegion),
    companySize: isCompanySize(job.companySize) ? job.companySize : COMPANY_SIZES[0],
    showInJobBoard: isBrowsableCrawledJob(job),
    updatedAt: new Date().toISOString(),
  });

  return existing.exists ? 'updated' : 'created';
}

export async function listActiveJobIdsBySource(sourceId: string): Promise<string[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).where('sourceId', '==', sourceId).get();
  return snap.docs.filter((doc) => doc.data().status === 'active').map((doc) => doc.id);
}

export async function listActiveJobIdsBySourceAndCompany(
  sourceId: string,
  companyName: string,
): Promise<string[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const trimmed = companyName.trim();
  const snap = await db.collection(COLLECTION).where('sourceId', '==', sourceId).get();
  return snap.docs
    .filter((doc) => {
      const data = doc.data();
      return data.status === 'active' && typeof data.companyName === 'string' && data.companyName.trim() === trimmed;
    })
    .map((doc) => doc.id);
}

export async function markCrawledJobsClosed(ids: string[], closedAt: string): Promise<number> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  if (ids.length === 0) return 0;

  let closed = 0;
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db.batch();
    for (const id of ids.slice(i, i + 400)) {
      batch.set(
        db.collection(COLLECTION).doc(id),
        { status: 'closed', closedAt, updatedAt: closedAt },
        { merge: true },
      );
      closed += 1;
    }
    await batch.commit();
  }
  return closed;
}

export async function closeExpiredCrawledJobs(todayDate: string): Promise<number> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).where('status', '==', 'active').get();
  const toClose = snap.docs
    .filter((doc) => {
      const deadline = doc.data().deadline;
      return typeof deadline === 'string' && deadline < todayDate;
    })
    .map((doc) => doc.id);

  return markCrawledJobsClosed(toClose, new Date().toISOString());
}

export function validateCrawledJobInput(data: Record<string, unknown>): CrawledJob | null {
  const id = typeof data.id === 'string' ? data.id.trim() : '';
  if (!id) return null;
  return fromDoc(id, data);
}

export const CRAWLED_JOB_FIELD_OPTIONS = {
  employmentTypes: EMPLOYMENT_TYPES,
  roles: JOB_ROLES,
  regions: JOB_REGIONS,
};

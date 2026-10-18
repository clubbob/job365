import type { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  JOB_REGIONS,
  JOB_ROLES,
  isCompanySize,
  isEmploymentType,
  isJobRegion,
  parseJobRoles,
} from '@/lib/job-board/constants';
import { ADMIN_CRAWLED_JOBS_PAGE_SIZE } from '@/lib/admin-constants';
import { SAMPLE_CRAWLED_JOBS } from '@/lib/job-board/sample-jobs';
import { getDisplayDisabledCompanyKeys, isCompanyCrawlDisabled } from '@/lib/crawl-company-policy-server';
import { getDisplayDisabledSourceIds, isDisplayDisabled } from '@/lib/crawl-source-policy-server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { decodeHtmlEntities } from '@/lib/crawler/decode-html-text';
import { inferJobRoles } from '@/lib/crawler/map-fields';
import { normalizeJobTitle } from '@/lib/crawler/normalize-job-title';
import { isJobTitleStaleForListing, isLikelyJobUrl } from '@/lib/crawler/job-heuristics';
import {
  isBrowsableCrawledJob,
  isInvalidJobTitle,
  shouldPersistCrawledJob,
} from '@/lib/crawler/job-quality';
import {
  isCrawledJobPostingOpen,
  parseDeadlineFromJobTitle,
} from '@/lib/job-board/crawled-deadline';
import { dedupeCrawledJobListItems } from '@/lib/job-board/dedupe-list-jobs';
import { jobMatchesBoardFilters, matchesCrawledJobKeyword, type JobBoardFilters } from '@/lib/job-board/match';
import {
  addRecruitingEmployerToMap,
  createRecruitingEmployerAggregateMap,
  finalizeRecruitingEmployerAggregateMap,
  type RecruitingEmployerAggregate,
  type RecruitingEmployerJobRow,
} from '@/lib/recruiting-employers/aggregate';
import {
  clearPersistedCrawledJobSourceStats,
  readPersistedCrawledJobSourceStats,
  readPersistedCrawledJobSourceStatsStale,
  type PersistedCrawledJobSourceStats,
  writePersistedCrawledJobSourceStats,
} from '@/lib/crawled-job-source-stats-persist';
import { crawledJobRecruitingCompanyName } from '@/lib/job-display';
import { normalizeCompanyLabel } from '@/lib/crawler/company-name-match';
import type {
  CrawledJob,
  CrawledJobListItem,
  CrawledJobStatus,
  DiscoveredAffiliate,
} from '@/types/crawled-job';

const COLLECTION = 'crawledJobs';
const ADMIN_META_COLLECTION = 'adminMeta';
const ADMIN_JOB_COUNTS_DOC_ID = 'crawledActiveJobCountsBySource';
/** 사용자 목록·검색용 노출 가능 공고 캐시 TTL */
const LIST_CACHE_TTL_MS = 120_000;
/** 첫 페이지만 최근 active 문서를 소량 읽어 노출 공고를 채움 */
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

const BOARD_LIST_SELECT_FIELDS = [...ADMIN_LIST_SELECT_FIELDS, 'showInJobBoard'] as const;

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
  sourceStatsInflight.clear();
  clearPersistedCrawledJobSourceStats();
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
  const companyName =
    typeof data.companyName === 'string' ? decodeHtmlEntities(data.companyName).trim() : '';
  const titleRaw = typeof data.title === 'string' ? decodeHtmlEntities(data.title).trim() : '';
  const title = titleRaw ? normalizeJobTitle(titleRaw) : '';
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
    roles: parseJobRoles(data.roles),
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
    showInJobBoard:
      data.showInJobBoard === true ? true : data.showInJobBoard === false ? false : undefined,
  };
}

function isJobEligibleForBoardList(job: CrawledJob): boolean {
  if (job.status !== 'active' || isInvalidJobTitle(job.title)) return false;
  if (!isCrawledJobPostingOpen(job.deadline, job.title)) return false;
  if (job.showInJobBoard === false) return false;
  // 목록 조회는 description을 생략할 수 있음(구버전·select). 제목·지원 URL이 공고 형태여야 함.
  if (!job.description?.trim()) {
    return typeof job.applyUrl === 'string' && job.applyUrl.trim() !== '' && isLikelyJobUrl(job.applyUrl);
  }
  return isBrowsableCrawledJob(job);
}

function toListItem(job: CrawledJob): CrawledJobListItem {
  // 저장된 roles는 예전 분류 규칙일 수 있어 제목 기준으로 다시 맞춥니다.
  const {
    id,
    sourceName,
    companyName,
    title,
    employmentTypes,
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
    roles: inferJobRoles(title),
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
  const active = jobs.filter((job) => isJobEligibleForBoardList(job));
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

  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'active')
    .select(...BOARD_LIST_SELECT_FIELDS)
    .get();
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
    const browsable = await filterBrowsableJobs(await listActiveFromFirestore());
    const jobs = dedupeCrawledJobListItems(browsable);
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
  recruitingEmployerCountByNorm: Record<string, number>;
  recruitingEmployerAggregates: RecruitingEmployerAggregate[];
};

type CrawledJobSourceStatsInternal = CrawledJobSourceStats & {
  _employerMap?: ReturnType<typeof createRecruitingEmployerAggregateMap>;
};

function statsFromPersisted(persisted: PersistedCrawledJobSourceStats): CrawledJobSourceStatsInternal {
  return {
    jobCountsBySource: persisted.jobCountsBySource,
    discoveredBySource: {},
    recruitingEmployerCountByNorm: {},
    recruitingEmployerAggregates: [],
  };
}

function ensureRecruitingEmployerAggregates(stats: CrawledJobSourceStatsInternal): RecruitingEmployerAggregate[] {
  if (stats.recruitingEmployerAggregates.length > 0) return stats.recruitingEmployerAggregates;
  if (stats._employerMap) {
    stats.recruitingEmployerAggregates = finalizeRecruitingEmployerAggregateMap(stats._employerMap);
    return stats.recruitingEmployerAggregates;
  }
  stats.recruitingEmployerAggregates = Object.entries(stats.recruitingEmployerCountByNorm)
    .map(([norm, activeJobCount]) => ({
      companyName: norm,
      activeJobCount,
      sourceIds: [] as string[],
    }))
    .sort((a, b) => b.activeJobCount - a.activeJobCount || a.companyName.localeCompare(b.companyName, 'ko'));
  return stats.recruitingEmployerAggregates;
}

type AdminMetaJobStats = {
  jobCountsBySource: Record<string, number>;
  activeJobCount: number | null;
};

async function readAdminMetaJobStats(): Promise<AdminMetaJobStats | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const snap = await db.collection(ADMIN_META_COLLECTION).doc(ADMIN_JOB_COUNTS_DOC_ID).get();
    if (!snap.exists) return null;
    const data = snap.data();
    const raw = data?.jobCountsBySource;
    if (!raw || typeof raw !== 'object') return null;
    const counts: Record<string, number> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'number' && Number.isFinite(value)) counts[key] = value;
    }
    if (Object.keys(counts).length === 0) return null;
    const activeJobCount =
      typeof data?.activeJobCount === 'number' && Number.isFinite(data.activeJobCount)
        ? data.activeJobCount
        : null;
    return { jobCountsBySource: counts, activeJobCount };
  } catch (error) {
    console.warn('[crawled-jobs] admin job counts doc read failed', error);
    return null;
  }
}

async function readAdminJobCountsBySource(): Promise<Record<string, number> | null> {
  const meta = await readAdminMetaJobStats();
  return meta?.jobCountsBySource ?? null;
}

function writeAdminJobCountsBySource(jobCountsBySource: Record<string, number>, activeJobCount: number): void {
  const db = getAdminFirestore();
  if (!db) return;
  void db
    .collection(ADMIN_META_COLLECTION)
    .doc(ADMIN_JOB_COUNTS_DOC_ID)
    .set({
      updatedAt: new Date().toISOString(),
      jobCountsBySource,
      activeJobCount,
    })
    .catch((error) => {
      console.warn('[crawled-jobs] admin job counts doc write failed', error);
    });
}

/** 관리자 통계 — 모집 중 공고 건수(캐시 우선, 전체 목록 스캔 없음) */
export async function getAdminActiveJobCountForStats(): Promise<number> {
  const meta = await readAdminMetaJobStats();
  if (meta && meta.activeJobCount !== null) return meta.activeJobCount;
  return countActiveCrawledJobs();
}

function persistSourceStats(cacheKey: string, stats: CrawledJobSourceStatsInternal): void {
  setImmediate(() => {
    writePersistedCrawledJobSourceStats({
      version: 2,
      cachedAt: Date.now(),
      cacheKey,
      jobCountsBySource: stats.jobCountsBySource,
    });
  });
}

let sourceStatsCache: { expiresAt: number; data: CrawledJobSourceStats; key: string } | null = null;
const sourceStatsInflight = new Map<string, Promise<CrawledJobSourceStats>>();
const SOURCE_STATS_TTL_MS = 120_000;

const SOURCE_STATS_SELECT_FIELDS = ['sourceId', 'companyName', 'title', 'status'] as const;

function recruitingEmployerFromRow(
  row: RecruitingEmployerJobRow,
  cache: Map<string, string>,
): string {
  const cacheKey = `${row.sourceId}\u0001${row.companyName}\u0001${row.title}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const employer = crawledJobRecruitingCompanyName(row).trim();
  cache.set(cacheKey, employer);
  return employer;
}

function buildSourceStatsFromActiveRows(rows: RecruitingEmployerJobRow[]): CrawledJobSourceStatsInternal {
  const jobCountsBySource: Record<string, number> = {};
  const bySource = new Map<string, Map<string, number>>();
  const recruitingByEmployer = createRecruitingEmployerAggregateMap();
  const employerParseCache = new Map<string, string>();
  const recruitingEmployerCountByNorm: Record<string, number> = {};

  for (const row of rows) {
    jobCountsBySource[row.sourceId] = (jobCountsBySource[row.sourceId] ?? 0) + 1;

    const employer = recruitingEmployerFromRow(row, employerParseCache);
    if (!employer) continue;

    addRecruitingEmployerToMap(recruitingByEmployer, row.sourceId, employer);

    const norm = normalizeCompanyLabel(employer);
    if (norm) recruitingEmployerCountByNorm[norm] = (recruitingEmployerCountByNorm[norm] ?? 0) + 1;

    if (!bySource.has(row.sourceId)) bySource.set(row.sourceId, new Map());
    const companies = bySource.get(row.sourceId)!;
    companies.set(employer, (companies.get(employer) ?? 0) + 1);
  }

  const discoveredBySource: Record<string, DiscoveredAffiliate[]> = {};
  for (const [sourceId, companies] of bySource) {
    discoveredBySource[sourceId] = [...companies.entries()].map(([companyName, activeJobCount]) => ({
      companyName,
      activeJobCount,
    }));
  }

  return {
    jobCountsBySource,
    discoveredBySource,
    recruitingEmployerCountByNorm,
    recruitingEmployerAggregates: [],
    _employerMap: recruitingByEmployer,
  };
}

function buildSourceStats(jobs: CrawledJob[]): CrawledJobSourceStats {
  return buildSourceStatsFromActiveRows(
    jobs
      .filter((job) => job.status === 'active')
      .map((job) => ({
        sourceId: job.sourceId,
        companyName: job.companyName.trim(),
        title: job.title,
      }))
      .filter((row) => row.companyName && row.title),
  );
}

async function listActiveJobRowsForSourceStats(): Promise<RecruitingEmployerJobRow[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'active')
    .select(...SOURCE_STATS_SELECT_FIELDS)
    .get();

  const rows: RecruitingEmployerJobRow[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const sourceId = typeof data.sourceId === 'string' ? data.sourceId.trim() : '';
    const companyName = typeof data.companyName === 'string' ? data.companyName.trim() : '';
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (sourceId && companyName && title) rows.push({ sourceId, companyName, title });
  }
  return rows;
}

/** 모집 회사별 active 공고 건수(사이트·관리자 탭 집계) */
export async function getRecruitingEmployerAggregates(options?: {
  skipDisplayFilters?: boolean;
}): Promise<RecruitingEmployerAggregate[]> {
  const stats = await getCrawledJobSourceStats(options);
  return ensureRecruitingEmployerAggregates(stats as CrawledJobSourceStatsInternal);
}

async function fetchCrawledJobSourceStatsFromStore(
  cacheKey: string,
  skipDisplayFilters: boolean,
): Promise<CrawledJobSourceStats> {
  let rows: RecruitingEmployerJobRow[];
  try {
    rows = await listActiveJobRowsForSourceStats();
  } catch (error) {
    console.warn('[crawled-jobs] source stats select query failed, falling back to full scan', error);
    const allJobs = (await listAllCrawledJobsForAggregation()).filter((job) => job.status === 'active');
    const jobs = skipDisplayFilters ? allJobs : await filterDisplayableJobs(allJobs);
    const stats = buildSourceStats(jobs);
    persistSourceStats(cacheKey, stats);
    writeAdminJobCountsBySource(
      stats.jobCountsBySource,
      jobs.filter((job) => job.status === 'active').length,
    );
    return stats;
  }

  if (!skipDisplayFilters) {
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

  const stats = buildSourceStatsFromActiveRows(rows);
  persistSourceStats(cacheKey, stats);
  writeAdminJobCountsBySource(stats.jobCountsBySource, rows.length);
  return stats;
}

async function loadCrawledJobSourceStats(cacheKey: string, skipDisplayFilters: boolean): Promise<CrawledJobSourceStats> {
  const persisted = readPersistedCrawledJobSourceStats(cacheKey);
  if (persisted) {
    return statsFromPersisted(persisted);
  }

  if (skipDisplayFilters) {
    const stale = readPersistedCrawledJobSourceStatsStale(cacheKey);
    if (stale) {
      void fetchCrawledJobSourceStatsFromStore(cacheKey, true)
        .then((data) => {
          const entry = { expiresAt: Date.now() + SOURCE_STATS_TTL_MS, data, key: cacheKey };
          sourceStatsCache = entry;
        })
        .catch((error) => {
          console.warn('[crawled-jobs] background source stats refresh failed', error);
        });
      return statsFromPersisted(stale);
    }

    const adminCounts = await readAdminJobCountsBySource();
    if (adminCounts) {
      const snapshot: PersistedCrawledJobSourceStats = {
        version: 2,
        cachedAt: Date.now(),
        cacheKey,
        jobCountsBySource: adminCounts,
      };
      writePersistedCrawledJobSourceStats(snapshot);
      void fetchCrawledJobSourceStatsFromStore(cacheKey, true)
        .then((data) => {
          sourceStatsCache = { expiresAt: Date.now() + SOURCE_STATS_TTL_MS, data, key: cacheKey };
        })
        .catch((error) => {
          console.warn('[crawled-jobs] background source stats refresh failed', error);
        });
      return statsFromPersisted(snapshot);
    }
  }

  return fetchCrawledJobSourceStatsFromStore(cacheKey, skipDisplayFilters);
}

/** 채용 사이트별 공고 건수·계열사를 한 번의 조회로 집계합니다. */
export async function getCrawledJobSourceStats(options?: {
  skipDisplayFilters?: boolean;
}): Promise<CrawledJobSourceStats> {
  const cacheKey = options?.skipDisplayFilters ? 'all' : 'visible';
  if (sourceStatsCache && sourceStatsCache.expiresAt > Date.now() && sourceStatsCache.key === cacheKey) {
    return sourceStatsCache.data;
  }

  const inflight = sourceStatsInflight.get(cacheKey);
  if (inflight) return inflight;

  const promise = loadCrawledJobSourceStats(cacheKey, Boolean(options?.skipDisplayFilters))
    .then((data) => {
      const entry = { expiresAt: Date.now() + SOURCE_STATS_TTL_MS, data, key: cacheKey };
      sourceStatsCache = entry;
      return data;
    })
    .finally(() => {
      sourceStatsInflight.delete(cacheKey);
    });

  sourceStatsInflight.set(cacheKey, promise);
  return promise;
}

/** 관리자 회사 목록 — 캐시된 건수만 쓰고, 전체 공고 스캔은 기다리지 않습니다. */
export async function getJobCountsForAdminList(): Promise<Record<string, number>> {
  const cacheKey = 'all';
  if (sourceStatsCache && sourceStatsCache.key === cacheKey && sourceStatsCache.expiresAt > Date.now()) {
    return sourceStatsCache.data.jobCountsBySource;
  }

  const fresh = readPersistedCrawledJobSourceStats(cacheKey);
  if (fresh) {
    scheduleAdminSourceStatsRefresh();
    return fresh.jobCountsBySource;
  }

  const stale = readPersistedCrawledJobSourceStatsStale(cacheKey);
  if (stale) {
    scheduleAdminSourceStatsRefresh();
    return stale.jobCountsBySource;
  }

  const adminCounts = await readAdminJobCountsBySource();
  scheduleAdminSourceStatsRefresh();
  return adminCounts ?? {};
}

export function buildAdminStatsFromJobCounts(
  jobCountsBySource: Record<string, number>,
): CrawledJobSourceStats {
  return {
    jobCountsBySource,
    discoveredBySource: {},
    recruitingEmployerCountByNorm: {},
    recruitingEmployerAggregates: [],
  };
}

function scheduleAdminSourceStatsRefresh(): void {
  const cacheKey = 'all';
  if (sourceStatsInflight.has(cacheKey)) return;

  const promise = fetchCrawledJobSourceStatsFromStore(cacheKey, true)
    .then((data) => {
      sourceStatsCache = { expiresAt: Date.now() + SOURCE_STATS_TTL_MS, data, key: cacheKey };
      return data;
    })
    .catch((error) => {
      console.warn('[crawled-jobs] background source stats refresh failed', error);
      throw error;
    })
    .finally(() => {
      sourceStatsInflight.delete(cacheKey);
    });

  sourceStatsInflight.set(cacheKey, promise);
}

/** 채용 사이트(sourceId)별 active 공고 건수 */
export async function countActiveJobsBySource(): Promise<Record<string, number>> {
  const { jobCountsBySource } = await getCrawledJobSourceStats();
  return jobCountsBySource;
}

/** 중견 명단 회사 crawlSourceId — 채용 URL·고용24 수집 sourceId 합산 */
export function activeJobCountForMidSizedCrawlSource(
  crawlSourceId: string,
  jobCountsBySource: Record<string, number>,
): number {
  const base = crawlSourceId.trim();
  if (!base) return 0;
  return (
    (jobCountsBySource[`${base}-careers`] ?? 0) + (jobCountsBySource[`${base}-work24-careers`] ?? 0)
  );
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

/** 관리자 목록: 구직자 채용 정보 노출 여부 */
export type AdminCrawledJobsBoardFilter = 'all' | 'on_board' | 'off_board';

export type AdminCrawledJobsPageResult = {
  jobs: AdminCrawledJobRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts?: {
    storedActive: number;
    boardVisible: number;
  };
};

function toAdminCrawledJobRow(job: CrawledJob, hidden: Set<string>): AdminCrawledJobRow {
  return {
    ...toListItem(job),
    sourceId: job.sourceId,
    displayHidden: hidden.has(job.sourceId),
  };
}

function matchesAdminCrawledJobQuery(job: CrawledJob, q: string): boolean {
  return matchesCrawledJobKeyword(job, q, { includeCollectSource: true });
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

async function getOnBoardCrawledJobIds(): Promise<Set<string>> {
  const browsable = await getBrowsableCrawledJobs();
  return new Set(browsable.map((job) => job.id));
}

async function filterAdminCrawledJobsByBoard(
  jobs: CrawledJob[],
  board: AdminCrawledJobsBoardFilter,
): Promise<CrawledJob[]> {
  if (board === 'all') return jobs;
  const onBoardIds = await getOnBoardCrawledJobIds();
  if (board === 'on_board') return jobs.filter((job) => onBoardIds.has(job.id));
  return jobs.filter((job) => !onBoardIds.has(job.id));
}

async function attachAdminCrawledJobCounts(
  result: AdminCrawledJobsPageResult,
  page: number,
  status: AdminCrawledJobsStatusFilter,
): Promise<AdminCrawledJobsPageResult> {
  if (page !== 1 || status !== 'active') return result;
  try {
    const [storedActive, browsable] = await Promise.all([
      countActiveCrawledJobs(),
      getBrowsableCrawledJobs(),
    ]);
    return {
      ...result,
      counts: { storedActive, boardVisible: browsable.length },
    };
  } catch {
    return result;
  }
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

/** 관리자용: 기본 모집 중·50건 페이지네이션. 검색·노출 필터는 메모리 필터 후 페이지네이션 */
export async function listCrawledJobsForAdminPage(
  page: number,
  pageSize: number,
  status: AdminCrawledJobsStatusFilter = 'active',
  q = '',
  board: AdminCrawledJobsBoardFilter = 'all',
): Promise<AdminCrawledJobsPageResult> {
  const hidden = await getDisplayDisabledSourceIds();
  const trimmedQ = q.trim();
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, ADMIN_CRAWLED_JOBS_PAGE_SIZE));
  const needsMemoryList = Boolean(trimmedQ) || board !== 'all';

  if (needsMemoryList) {
    try {
      const source =
        status === 'active' || status === 'closed'
          ? await listCrawledJobsByStatusForAdminCache(status)
          : await listAllCrawledJobsForAdminSearch();
      let jobs = filterAdminCrawledJobs(source, status, trimmedQ);
      jobs = await filterAdminCrawledJobsByBoard(jobs, board);
      if (jobs.length > 0 || !shouldUseSampleFallback()) {
        const result = paginateAdminCrawledJobs(jobs, hidden, safePage, safePageSize);
        return attachAdminCrawledJobCounts(result, safePage, status);
      }
    } catch (error) {
      console.warn('[crawled-jobs] admin search list failed', error);
      if (!shouldUseSampleFallback()) throw error;
    }

    let sampleJobs = filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, trimmedQ);
    sampleJobs = await filterAdminCrawledJobsByBoard(sampleJobs, board);
    const result = paginateAdminCrawledJobs(sampleJobs, hidden, safePage, safePageSize);
    return attachAdminCrawledJobCounts(result, safePage, status);
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

      const result: AdminCrawledJobsPageResult = {
        jobs,
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      };
      return attachAdminCrawledJobCounts(result, safePage, status);
    }

    const { jobs: statusJobs, total } = await listAdminCrawledJobsByStatusPaged(
      status,
      safePage,
      safePageSize,
    );

    if (statusJobs.length === 0 && total === 0 && shouldUseSampleFallback()) {
      const fallback = paginateAdminCrawledJobs(
        filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, ''),
        hidden,
        safePage,
        safePageSize,
      );
      return attachAdminCrawledJobCounts(fallback, safePage, status);
    }

    const result: AdminCrawledJobsPageResult = {
      jobs: statusJobs.map((job) => toAdminCrawledJobRow(job, hidden)),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
    return attachAdminCrawledJobCounts(result, safePage, status);
  } catch (error) {
    console.warn('[crawled-jobs] admin paged list failed', error);
    if (!shouldUseSampleFallback()) throw error;

    const fallback = paginateAdminCrawledJobs(
      filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, ''),
      hidden,
      safePage,
      safePageSize,
    );
    return attachAdminCrawledJobCounts(fallback, safePage, status);
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

function filterOpenDeadlineListItems(items: CrawledJobListItem[]): CrawledJobListItem[] {
  return items.filter((job) => isCrawledJobPostingOpen(job.deadline, job.title));
}

export async function listCrawledJobs(): Promise<CrawledJobListItem[]> {
  if (listCache && listCache.expiresAt > Date.now()) {
    return filterOpenDeadlineListItems(listCache.items);
  }

  try {
    const jobs = await getBrowsableCrawledJobs();
    if (jobs.length > 0) {
      const items = listCache?.items ?? jobs.map(toListItem);
      return filterOpenDeadlineListItems(items);
    }
    if (!shouldUseSampleFallback()) return [];
  } catch (error) {
    console.warn('[crawled-jobs] Firestore list failed', error);
    if (!shouldUseSampleFallback()) throw error;
  }

  const items = filterOpenDeadlineListItems(SAMPLE_CRAWLED_JOBS.map(toListItem));
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
    console.warn('[crawled-jobs] active count failed', error);
    return 0;
  }
}

/** 구직자 채용 공고 목록(`/jobs`)과 동일한 모집 중 건수 */
export async function countBrowsableCrawledJobs(): Promise<number> {
  try {
    const { total } = await listActiveCrawledJobsPage(1, 1);
    return total;
  } catch (error) {
    console.warn('[crawled-jobs] browsable count failed', error);
    return 0;
  }
}

/** 검색·빠른 필터·상세 필터 (캐시된 목록 필드만 사용) */
export async function listFilteredCrawledJobsPage(
  page: number,
  pageSize: number,
  filters: JobBoardFilters,
): Promise<{ items: CrawledJobListItem[]; total: number }> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 50));
  const start = (safePage - 1) * safePageSize;

  const jobs = await getBrowsableCrawledJobs();
  const filtered = jobs.map(toListItem).filter((item) => jobMatchesBoardFilters(item, filters));

  return {
    items: filtered.slice(start, start + safePageSize),
    total: filtered.length,
  };
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
    const browsable = await getBrowsableCrawledJobs();
    return {
      items: browsable.slice(start, start + safePageSize).map(toListItem),
      total: browsable.length,
    };
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
      if (parsed && isJobEligibleForBoardList(parsed)) {
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

  const normalizedTitle = normalizeJobTitle(decodeHtmlEntities(job.title));
  const embeddedDeadline = parseDeadlineFromJobTitle(normalizedTitle);
  let resolvedDeadline = job.deadline;
  if (embeddedDeadline) {
    const stored = job.deadline;
    const storedOpen = stored == null || stored === '' || stored === 'open';
    if (storedOpen) {
      resolvedDeadline = embeddedDeadline;
    } else {
      const storedIso = stored.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      if (storedIso && embeddedDeadline < storedIso) resolvedDeadline = embeddedDeadline;
    }
  }

  const normalizedJob: CrawledJob = {
    ...job,
    companyName: decodeHtmlEntities(job.companyName).trim(),
    title: normalizedTitle,
    description: decodeHtmlEntities(job.description),
    deadline: resolvedDeadline,
  };

  if (await isCompanyCrawlDisabled(normalizedJob.sourceId, normalizedJob.companyName)) {
    return 'unchanged';
  }

  const createdAt = existingJob?.createdAt ?? normalizedJob.createdAt;

  await ref.set({
    ...normalizedJob,
    createdAt,
    employmentTypes: normalizedJob.employmentTypes.filter(isEmploymentType),
    roles: parseJobRoles(normalizedJob.roles),
    regions: normalizedJob.regions.filter(isJobRegion),
    companySize: isCompanySize(normalizedJob.companySize) ? normalizedJob.companySize : COMPANY_SIZES[0],
    showInJobBoard: isBrowsableCrawledJob(normalizedJob),
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
      const data = doc.data();
      const deadline = data.deadline;
      const title = typeof data.title === 'string' ? data.title : '';
      if (!isCrawledJobPostingOpen(deadline, title, todayDate)) return true;
      return isJobTitleStaleForListing(title, todayDate);
    })
    .map((doc) => doc.id);

  const closed = await markCrawledJobsClosed(toClose, new Date().toISOString());
  if (closed > 0) invalidateCrawledJobsListCache();
  return closed;
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

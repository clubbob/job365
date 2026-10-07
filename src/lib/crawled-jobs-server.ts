import type { DocumentData, Timestamp } from 'firebase-admin/firestore';
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
import type {
  CrawledJob,
  CrawledJobListItem,
  CrawledJobStatus,
  DiscoveredAffiliate,
} from '@/types/crawled-job';

const COLLECTION = 'crawledJobs';
const LIST_CACHE_TTL_MS = 60_000;

let listCache: { expiresAt: number; items: CrawledJobListItem[] } | null = null;

export function invalidateCrawledJobsListCache(): void {
  listCache = null;
  sourceStatsCache = null;
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

async function listFromFirestore(): Promise<CrawledJob[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((item): item is CrawledJob => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function listBrowsableFromFirestore(): Promise<CrawledJob[]> {
  return filterBrowsableJobs(await listFromFirestore());
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

function buildSourceStats(jobs: CrawledJob[]): CrawledJobSourceStats {
  const jobCountsBySource: Record<string, number> = {};
  const bySource = new Map<string, Map<string, number>>();

  for (const job of jobs) {
    if (job.status !== 'active') continue;

    jobCountsBySource[job.sourceId] = (jobCountsBySource[job.sourceId] ?? 0) + 1;

    const companyName = job.companyName.trim();
    if (!companyName) continue;

    if (!bySource.has(job.sourceId)) bySource.set(job.sourceId, new Map());
    const companies = bySource.get(job.sourceId)!;
    companies.set(companyName, (companies.get(companyName) ?? 0) + 1);
  }

  const discoveredBySource: Record<string, DiscoveredAffiliate[]> = {};
  for (const [sourceId, companies] of bySource) {
    discoveredBySource[sourceId] = [...companies.entries()]
      .map(([companyName, activeJobCount]) => ({ companyName, activeJobCount }))
      .sort((a, b) => a.companyName.localeCompare(b.companyName, 'ko'));
  }

  return { jobCountsBySource, discoveredBySource };
}

/** 채용 사이트별 공고 건수·계열사를 한 번의 조회로 집계합니다. */
export async function getCrawledJobSourceStats(options?: {
  skipDisplayFilters?: boolean;
}): Promise<CrawledJobSourceStats> {
  const cacheKey = options?.skipDisplayFilters ? 'all' : 'visible';
  if (sourceStatsCache && sourceStatsCache.expiresAt > Date.now() && sourceStatsCache.key === cacheKey) {
    return sourceStatsCache.data;
  }

  const allJobs = (await listAllCrawledJobsForAggregation()).filter((job) => job.status === 'active');
  const jobs = options?.skipDisplayFilters ? allJobs : await filterDisplayableJobs(allJobs);
  const data = buildSourceStats(jobs);
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
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [job.title, job.companyName, job.sourceName, job.sourceId].join(' ').toLowerCase().includes(needle);
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
      const jobs = filterAdminCrawledJobs(await listFromFirestore(), status, trimmedQ);
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
    if (status !== 'all') {
      const snap = await db.collection(COLLECTION).where('status', '==', status).get();
      const filtered = snap.docs
        .map((doc) => fromDoc(doc.id, doc.data()))
        .filter((item): item is CrawledJob => Boolean(item))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      if (filtered.length === 0 && shouldUseSampleFallback()) {
        return paginateAdminCrawledJobs(filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, ''), hidden, safePage, safePageSize);
      }

      return paginateAdminCrawledJobs(filtered, hidden, safePage, safePageSize);
    }

    const totalSnap = await db.collection(COLLECTION).count().get();
    const total = totalSnap.data().count;

    if (total === 0 && shouldUseSampleFallback()) {
      return paginateAdminCrawledJobs(filterAdminCrawledJobs(SAMPLE_CRAWLED_JOBS, status, ''), hidden, safePage, safePageSize);
    }

    const offset = (safePage - 1) * safePageSize;
    const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(offset + safePageSize).get();
    const jobs = snap.docs
      .slice(offset)
      .map((doc) => fromDoc(doc.id, doc.data()))
      .filter((item): item is CrawledJob => Boolean(item))
      .map((job) => toAdminCrawledJobRow(job, hidden));

    const totalPages = Math.max(1, Math.ceil(total / safePageSize));

    return {
      jobs,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
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
    const jobs = await listBrowsableFromFirestore();
    if (jobs.length > 0) {
      const items = jobs.map(toListItem);
      listCache = { expiresAt: Date.now() + LIST_CACHE_TTL_MS, items };
      return items;
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
    const db = getAdminFirestore();
    if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

    const browsable = await listBrowsableFromFirestore();
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

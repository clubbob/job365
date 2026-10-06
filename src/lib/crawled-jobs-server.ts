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
import { SAMPLE_CRAWLED_JOBS } from '@/lib/job-board/sample-jobs';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { isBrowsableCrawledJob, shouldPersistCrawledJob } from '@/lib/crawler/job-quality';
import type { CrawledJob, CrawledJobListItem, CrawledJobStatus } from '@/types/crawled-job';

const COLLECTION = 'crawledJobs';
const LIST_CACHE_TTL_MS = 60_000;

let listCache: { expiresAt: number; items: CrawledJobListItem[] } | null = null;

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

function filterBrowsableJobs(jobs: CrawledJob[]): CrawledJob[] {
  return jobs.filter((job) => job.status === 'active' && isBrowsableCrawledJob(job));
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

export type DiscoveredAffiliate = {
  companyName: string;
  activeJobCount: number;
};

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

let sourceStatsCache: { expiresAt: number; data: CrawledJobSourceStats } | null = null;
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
export async function getCrawledJobSourceStats(): Promise<CrawledJobSourceStats> {
  if (sourceStatsCache && sourceStatsCache.expiresAt > Date.now()) {
    return sourceStatsCache.data;
  }

  const jobs = await listAllCrawledJobsForAggregation();
  const data = buildSourceStats(jobs);
  sourceStatsCache = { expiresAt: Date.now() + SOURCE_STATS_TTL_MS, data };
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
      if (parsed && isBrowsableCrawledJob(parsed) && parsed.status === 'active') return parsed;
    }
  }

  if (!shouldUseSampleFallback()) return null;
  return SAMPLE_CRAWLED_JOBS.find((job) => job.id === id) ?? null;
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

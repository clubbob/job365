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
import type { CrawledJob, CrawledJobListItem, CrawledJobStatus } from '@/types/crawled-job';

const COLLECTION = 'crawledJobs';

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

async function listFromFirestore(): Promise<CrawledJob[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((item): item is CrawledJob => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function shouldUseSampleFallback(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.CRAWLER_USE_SAMPLES !== 'false';
}

export async function listCrawledJobs(): Promise<CrawledJobListItem[]> {
  try {
    const jobs = await listFromFirestore();
    if (jobs.length > 0) return jobs.map(toListItem);
    if (!shouldUseSampleFallback()) return [];
  } catch (error) {
    console.warn('[crawled-jobs] Firestore list failed', error);
    if (!shouldUseSampleFallback()) throw error;
  }

  return SAMPLE_CRAWLED_JOBS.map(toListItem);
}

export async function getCrawledJob(id: string): Promise<CrawledJob | null> {
  const db = getAdminFirestore();
  if (db) {
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (snap.exists) {
      const parsed = fromDoc(snap.id, snap.data() ?? {});
      if (parsed) return parsed;
    }
  }

  if (!shouldUseSampleFallback()) return null;
  return SAMPLE_CRAWLED_JOBS.find((job) => job.id === id) ?? null;
}

export async function upsertCrawledJob(job: CrawledJob): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const ref = db.collection(COLLECTION).doc(job.id);
  const existing = await ref.get();
  const createdAt =
    existing.exists && typeof existing.data()?.createdAt === 'string'
      ? existing.data()!.createdAt
      : job.createdAt;

  await ref.set({
    ...job,
    createdAt,
    employmentTypes: job.employmentTypes.filter(isEmploymentType),
    roles: job.roles.filter(isJobRole),
    regions: job.regions.filter(isJobRegion),
    companySize: isCompanySize(job.companySize) ? job.companySize : COMPANY_SIZES[0],
    updatedAt: new Date().toISOString(),
  });
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

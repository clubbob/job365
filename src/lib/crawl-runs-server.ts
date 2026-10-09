import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { ADMIN_CRAWL_RUNS_PAGE_SIZE, ADMIN_CRAWL_RUNS_RETENTION_DAYS } from '@/lib/admin-constants';
import type { CrawlRunSummary } from '@/lib/crawler/types';

const COLLECTION = 'crawlRuns';

export async function saveCrawlRun(run: CrawlRunSummary): Promise<string> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    ...run,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export type CrawlRunListItem = CrawlRunSummary & { id: string; createdAt: string | null };

function mapCrawlRunDoc(id: string, data: DocumentData): CrawlRunListItem {
  const createdAt =
    data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt
      ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
      : typeof data.createdAt === 'string'
        ? data.createdAt
        : null;

  return {
    id,
    startedAt: String(data.startedAt ?? ''),
    finishedAt: String(data.finishedAt ?? ''),
    sources: Array.isArray(data.sources) ? data.sources : [],
    totalUpserted: Number(data.totalUpserted ?? 0),
    totalClosed: Number(data.totalClosed ?? 0),
    createdAt,
  };
}

export type CrawlRunsPageResult = {
  runs: CrawlRunListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listCrawlRunsPage(
  page: number,
  pageSize: number = ADMIN_CRAWL_RUNS_PAGE_SIZE,
): Promise<CrawlRunsPageResult> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, ADMIN_CRAWL_RUNS_PAGE_SIZE));
  const offset = (safePage - 1) * safePageSize;
  const collection = db.collection(COLLECTION);

  const [totalSnap, pageSnap] = await Promise.all([
    collection.count().get(),
    collection.orderBy('createdAt', 'desc').limit(offset + safePageSize).get(),
  ]);

  const total = totalSnap.data().count;
  const runs = pageSnap.docs
    .slice(offset)
    .map((doc) => mapCrawlRunDoc(doc.id, doc.data()));

  return {
    runs,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/** @deprecated listCrawlRunsPage를 사용하세요. */
export async function listCrawlRuns(limit = 20): Promise<CrawlRunListItem[]> {
  const { runs } = await listCrawlRunsPage(1, limit);
  return runs;
}

function resolveRunTimestamp(data: DocumentData): Date | null {
  if (data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt) {
    return (data.createdAt as { toDate: () => Date }).toDate();
  }
  const finishedAt = typeof data.finishedAt === 'string' ? data.finishedAt : '';
  const startedAt = typeof data.startedAt === 'string' ? data.startedAt : '';
  const iso = finishedAt || startedAt;
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** 관리자 로그만 삭제합니다. crawledJobs 등 채용 공고 데이터는 건드리지 않습니다. */
export async function deleteCrawlRunsOlderThanDays(
  days: number = ADMIN_CRAWL_RUNS_RETENTION_DAYS,
): Promise<{ deleted: number }> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const safeDays = Math.max(1, Math.min(Math.floor(days), 365));
  const cutoff = new Date(Date.now() - safeDays * 86_400_000);
  const collection = db.collection(COLLECTION);

  let deleted = 0;

  while (true) {
    const snap = await collection.where('createdAt', '<', cutoff).limit(400).get();
    if (snap.empty) break;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      deleted += 1;
    }
    await batch.commit();
  }

  const legacySnap = await collection.limit(500).get();
  const legacyDeletes = legacySnap.docs.filter((doc) => {
    const data = doc.data();
    if (data.createdAt) return false;
    const at = resolveRunTimestamp(data);
    return at !== null && at < cutoff;
  });
  for (let i = 0; i < legacyDeletes.length; i += 400) {
    const batch = db.batch();
    for (const doc of legacyDeletes.slice(i, i + 400)) {
      batch.delete(doc.ref);
      deleted += 1;
    }
    await batch.commit();
  }

  return { deleted };
}

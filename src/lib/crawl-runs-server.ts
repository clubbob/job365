import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
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

export async function listCrawlRuns(limit = 20): Promise<CrawlRunListItem[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).limit(Math.max(limit, 50)).get();
  return snap.docs
    .map((doc) => {
    const data = doc.data();
    const createdAt =
      data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt
        ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
        : typeof data.createdAt === 'string'
          ? data.createdAt
          : null;

      return {
        id: doc.id,
        startedAt: String(data.startedAt ?? ''),
        finishedAt: String(data.finishedAt ?? ''),
        sources: Array.isArray(data.sources) ? data.sources : [],
        totalUpserted: Number(data.totalUpserted ?? 0),
        totalClosed: Number(data.totalClosed ?? 0),
        createdAt,
      };
    })
    .sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''))
    .slice(0, limit);
}

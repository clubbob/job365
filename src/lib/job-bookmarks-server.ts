import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { getCrawledJob } from '@/lib/crawled-jobs-server';
import type { CrawledJobListItem } from '@/types/crawled-job';

const COLLECTION = 'jobBookmarks';

function bookmarkId(userId: string, jobId: string): string {
  return `${userId}_${jobId}`;
}

export async function listBookmarkedJobs(userId: string, limit = 100): Promise<CrawledJobListItem[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).where('userId', '==', userId).get();
  const docs = snap.docs
    .sort((a, b) => {
      const aTime =
        a.data().bookmarkedAt && typeof a.data().bookmarkedAt === 'object' && 'toDate' in a.data().bookmarkedAt
          ? (a.data().bookmarkedAt as { toDate: () => Date }).toDate().getTime()
          : 0;
      const bTime =
        b.data().bookmarkedAt && typeof b.data().bookmarkedAt === 'object' && 'toDate' in b.data().bookmarkedAt
          ? (b.data().bookmarkedAt as { toDate: () => Date }).toDate().getTime()
          : 0;
      return bTime - aTime;
    })
    .slice(0, limit);

  const items: CrawledJobListItem[] = [];
  for (const doc of docs) {
    const jobId = String(doc.data().jobId ?? '');
    if (!jobId) continue;
    const job = await getCrawledJob(jobId);
    if (!job || job.status !== 'active') continue;
    items.push({
      id: job.id,
      sourceName: job.sourceName,
      companyName: job.companyName,
      title: job.title,
      employmentTypes: job.employmentTypes,
      roles: job.roles,
      regions: job.regions,
      companySize: job.companySize,
      deadline: job.deadline,
      applyUrl: job.applyUrl,
      status: job.status,
      crawledAt: job.crawledAt,
      createdAt: job.createdAt,
    });
  }

  return items;
}

export async function isJobBookmarked(userId: string, jobId: string): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).doc(bookmarkId(userId, jobId)).get();
  return snap.exists;
}

export async function addJobBookmark(userId: string, jobId: string): Promise<void> {
  const job = await getCrawledJob(jobId);
  if (!job) throw new Error('NOT_FOUND');

  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  await db.collection(COLLECTION).doc(bookmarkId(userId, jobId)).set({
    userId,
    jobId,
    bookmarkedAt: FieldValue.serverTimestamp(),
  });
}

export async function removeJobBookmark(userId: string, jobId: string): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  await db.collection(COLLECTION).doc(bookmarkId(userId, jobId)).delete();
}

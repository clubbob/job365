import type { DocumentData } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { omitUndefined } from '@/lib/omit-undefined';
import type { JobPosting } from '@/types/job';

const COLLECTION = 'jobPostings';

export type StoredJobPosting = {
  ownerId: string;
  job: JobPosting;
};

function asJobPosting(value: unknown): JobPosting | null {
  if (!value || typeof value !== 'object') return null;
  const job = value as JobPosting;
  if (
    typeof job.id !== 'string' ||
    typeof job.title !== 'string' ||
    typeof job.companyName !== 'string' ||
    typeof job.workType !== 'string' ||
    typeof job.payLabel !== 'string'
  ) {
    return null;
  }
  return job;
}

function fromDoc(id: string, data: DocumentData): StoredJobPosting | null {
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  const job = asJobPosting(data.job ?? data);
  if (!ownerId || !job) return null;
  return { ownerId, job: { ...job, id: job.id || id } };
}

export async function listStoredJobPostings(): Promise<StoredJobPosting[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((item): item is StoredJobPosting => Boolean(item))
    .sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt));
}

export async function getStoredJobPosting(id: string): Promise<StoredJobPosting | null> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return fromDoc(snap.id, snap.data() ?? {});
}

export async function upsertStoredJobPosting(ownerId: string, job: JobPosting): Promise<StoredJobPosting> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const record = {
    ownerId,
    job: omitUndefined({ ...job } as Record<string, unknown>),
    updatedAt: new Date().toISOString(),
  };
  await db.collection(COLLECTION).doc(job.id).set(record);
  return { ownerId, job };
}

export async function deleteStoredJobPosting(id: string): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

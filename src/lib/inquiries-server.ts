import type { DocumentData } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { isInquiry, type Inquiry } from '@/lib/inquiry';
import { omitUndefined } from '@/lib/omit-undefined';

const COLLECTION = 'inquiries';

function fromDoc(id: string, data: DocumentData): Inquiry | null {
  const item = { ...data, id: typeof data.id === 'string' ? data.id : id };
  return isInquiry(item) ? item : null;
}

export async function listStoredInquiries(): Promise<Inquiry[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((item): item is Inquiry => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getStoredInquiry(id: string): Promise<Inquiry | null> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return fromDoc(snap.id, snap.data() ?? {});
}

export async function createStoredInquiry(inquiry: Inquiry): Promise<Inquiry> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  await db.collection(COLLECTION).doc(inquiry.id).set(omitUndefined({ ...inquiry }));
  return inquiry;
}

export async function deleteStoredInquiry(id: string): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

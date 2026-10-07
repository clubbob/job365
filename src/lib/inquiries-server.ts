import type { DocumentData } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { deleteInquiryAttachment } from '@/lib/inquiry-attachment-server';
import { normalizeInquiry, type Inquiry } from '@/lib/inquiry';
import { omitUndefined } from '@/lib/omit-undefined';

const COLLECTION = 'inquiries';

function fromDoc(id: string, data: DocumentData): Inquiry | null {
  const item = { ...data, id: typeof data.id === 'string' ? data.id : id };
  return normalizeInquiry(item);
}

export async function listStoredInquiries(): Promise<Inquiry[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).get();
  return sortInquiries(
    snap.docs
      .map((doc) => fromDoc(doc.id, doc.data()))
      .filter((item): item is Inquiry => Boolean(item)),
  );
}

export async function listStoredInquiriesByUser(userId: string): Promise<Inquiry[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).where('userId', '==', userId).get();
  return sortInquiries(
    snap.docs
      .map((doc) => fromDoc(doc.id, doc.data()))
      .filter((item): item is Inquiry => Boolean(item)),
  );
}

function sortInquiries(items: Inquiry[]): Inquiry[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateStoredInquiryReply(
  id: string,
  reply: Inquiry['reply'],
): Promise<Inquiry | null> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.set({ reply }, { merge: true });
  return fromDoc(snap.id, { ...snap.data(), reply });
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
  const inquiry = fromDoc(snap.id, snap.data() ?? {});
  await deleteInquiryAttachment(inquiry?.attachment ?? null);
  await ref.delete();
  return true;
}

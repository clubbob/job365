import type { DocumentData } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { omitUndefined } from '@/lib/omit-undefined';
import { normalizeNotice, type Notice } from '@/types/notice';

const COLLECTION = 'notices';

function fromDoc(id: string, data: DocumentData): Notice | null {
  return normalizeNotice({ ...data, id });
}

function sortNotices(items: Notice[], field: 'publishedAt' | 'updatedAt'): Notice[] {
  return [...items].sort((a, b) => {
    const aKey = field === 'publishedAt' ? a.publishedAt || a.createdAt : a.updatedAt || a.createdAt;
    const bKey = field === 'publishedAt' ? b.publishedAt || b.createdAt : b.updatedAt || b.createdAt;
    return bKey.localeCompare(aKey);
  });
}

export async function listPublishedNotices(): Promise<Notice[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  const snap = await db.collection(COLLECTION).where('published', '==', true).get();
  return sortNotices(
    snap.docs
      .map((doc) => fromDoc(doc.id, doc.data()))
      .filter((item): item is Notice => Boolean(item)),
    'publishedAt',
  );
}

export async function listAllNotices(): Promise<Notice[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).get();
  return sortNotices(
    snap.docs
      .map((doc) => fromDoc(doc.id, doc.data()))
      .filter((item): item is Notice => Boolean(item)),
    'updatedAt',
  );
}

export async function getNotice(id: string): Promise<Notice | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return fromDoc(snap.id, snap.data() ?? {});
}

export async function getPublishedNotice(id: string): Promise<Notice | null> {
  const notice = await getNotice(id);
  if (!notice?.published) return null;
  return notice;
}

export type NoticeWriteInput = {
  title: string;
  body: string;
  published: boolean;
};

export async function createNotice(id: string, input: NoticeWriteInput): Promise<Notice> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const now = new Date().toISOString();
  const publishedAt = input.published ? now : null;
  const notice: Notice = {
    id,
    title: input.title.trim(),
    body: input.body,
    published: input.published,
    createdAt: now,
    updatedAt: now,
    publishedAt,
  };
  await db.collection(COLLECTION).doc(id).set(omitUndefined({ ...notice }));
  return notice;
}

export async function updateNotice(id: string, input: NoticeWriteInput): Promise<Notice | null> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const existing = fromDoc(snap.id, snap.data() ?? {});
  if (!existing) return null;

  const now = new Date().toISOString();
  let publishedAt = existing.publishedAt;
  if (input.published && !existing.published) {
    publishedAt = now;
  }
  if (!input.published) {
    publishedAt = null;
  }

  const next: Notice = {
    ...existing,
    title: input.title.trim(),
    body: input.body,
    published: input.published,
    updatedAt: now,
    publishedAt,
  };
  await ref.set(omitUndefined({ ...next }), { merge: true });
  return next;
}

export async function deleteNotice(id: string): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

export function newNoticeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `notice-${crypto.randomUUID()}`;
  }
  return `notice-${Date.now()}`;
}

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

const COLLECTION = 'emailDigests';

export async function saveEmailDigestLog(input: {
  userId: string;
  email: string;
  jobCount: number;
  todayDate: string;
  status: 'sent' | 'failed';
  error?: string;
}): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  await db.collection(COLLECTION).add({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export type EmailDigestListItem = {
  id: string;
  userId: string;
  email: string;
  jobCount: number;
  todayDate: string;
  status: string;
  error: string | null;
  createdAt: string | null;
};

export async function listEmailDigests(limit = 50): Promise<EmailDigestListItem[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).limit(Math.max(limit, 100)).get();
  return snap.docs
    .map((doc) => {
    const data = doc.data();
    const createdAt =
      data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt
        ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
        : null;

      return {
        id: doc.id,
        userId: String(data.userId ?? ''),
        email: String(data.email ?? ''),
        jobCount: Number(data.jobCount ?? 0),
        todayDate: String(data.todayDate ?? ''),
        status: String(data.status ?? ''),
        error: typeof data.error === 'string' ? data.error : null,
        createdAt,
      };
    })
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, limit);
}

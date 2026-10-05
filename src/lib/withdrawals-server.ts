import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import type { WithdrawalLog } from '@/types/withdrawal';

const COLLECTION = 'withdrawalLogs';

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function saveWithdrawalLog(input: {
  userId: string;
  email: string | null;
  nickname: string;
  reason: string;
}): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  await db.collection(COLLECTION).add({
    userId: input.userId,
    email: input.email,
    nickname: input.nickname,
    reason: input.reason,
    withdrawnAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listWithdrawalLogs(limit = 100): Promise<WithdrawalLog[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).limit(Math.max(limit, 200)).get();

  return snap.docs
    .map((doc) => {
      const data = doc.data();
      const withdrawnAt = serializeTimestamp(data.withdrawnAt) ?? serializeTimestamp(data.createdAt);
      if (!withdrawnAt) return null;

      return {
        id: doc.id,
        userId: typeof data.userId === 'string' ? data.userId : '',
        email: typeof data.email === 'string' ? data.email : null,
        nickname: typeof data.nickname === 'string' && data.nickname.trim() ? data.nickname.trim() : '회원',
        reason: typeof data.reason === 'string' ? data.reason.trim() : '',
        withdrawnAt,
      };
    })
    .filter((item): item is WithdrawalLog => Boolean(item))
    .sort((a, b) => b.withdrawnAt.localeCompare(a.withdrawnAt))
    .slice(0, limit);
}

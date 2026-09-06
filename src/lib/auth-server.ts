import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminFirestore } from '@/lib/firebaseAdmin';
import type { UserProvider } from '@/types/user';

type SyncUserInput = {
  uid: string;
  email: string | null;
  displayName: string | null;
  provider: UserProvider;
};

export async function verifyIdToken(token: string) {
  const app = getAdminApp();
  if (!app) return null;

  try {
    return await getAuth(app).verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function touchUserLastActive(uid: string) {
  const db = getAdminFirestore();
  if (!db) throw new Error('Firestore Admin not available');

  await db.collection('users').doc(uid).set(
    {
      lastActiveAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function upsertUserFromAuth(input: SyncUserInput) {
  const db = getAdminFirestore();
  if (!db) throw new Error('Firestore Admin not available');

  const { uid, email, displayName, provider } = input;
  const userRef = db.collection('users').doc(uid);
  const settingsRef = db.collection('userSettings').doc(uid);
  const now = FieldValue.serverTimestamp();

  const nickname = displayName?.trim() || email?.split('@')[0] || '사용자';
  let isNewUser = false;

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);

    if (!userSnap.exists) {
      isNewUser = true;
      tx.set(userRef, {
        id: uid,
        email,
        nickname,
        provider,
        role: 'user',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
      });
      tx.set(settingsRef, {
        userId: uid,
        notifyEmailAgreed: true,
        updatedAt: now,
      });
      return;
    }

    const existing = userSnap.data() ?? {};
    const updates: Record<string, unknown> = {
      email,
      provider,
      updatedAt: now,
    };

    if (!existing.nickname) {
      updates.nickname = nickname;
    }

    tx.update(userRef, updates);
  });

  const userDoc = await userRef.get();
  return { user: userDoc.data(), isNewUser };
}

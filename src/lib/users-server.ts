import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminFirestore } from '@/lib/firebaseAdmin';
import type { UserProfile, UserProvider, UserSettings, AdminUserListItem } from '@/types/user';

export type UserAccount = {
  profile: UserProfile;
  settings: UserSettings;
  marketingAgreed: boolean;
};

export async function getUserAccount(uid: string): Promise<UserAccount | null> {
  const db = getAdminFirestore();
  if (!db) throw new Error('Firestore Admin not available');

  const [userSnap, settingsSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('userSettings').doc(uid).get(),
  ]);

  if (!userSnap.exists) return null;

  const userData = userSnap.data()!;
  const settingsData = settingsSnap.data();

  const profile: UserProfile = {
    id: uid,
    email: (userData.email as string | null) ?? null,
    nickname: typeof userData.nickname === 'string' && userData.nickname.trim()
      ? userData.nickname.trim()
      : '사용자',
    provider: (userData.provider as UserProvider) ?? 'email',
    role: (userData.role as UserProfile['role']) ?? 'user',
    status: (userData.status as UserProfile['status']) ?? 'active',
  };

  const settings: UserSettings = {
    userId: uid,
    notifyEmailAgreed: settingsData?.notifyEmailAgreed !== false,
  };

  return {
    profile,
    settings,
    marketingAgreed: userData.marketingAgreed === true,
  };
}

export type UpdateUserAccountInput = {
  nickname?: string;
  marketingAgreed?: boolean;
  notifyEmailAgreed?: boolean;
};

export async function updateUserAccount(
  uid: string,
  input: UpdateUserAccountInput,
): Promise<UserAccount> {
  const db = getAdminFirestore();
  if (!db) throw new Error('Firestore Admin not available');

  const now = FieldValue.serverTimestamp();
  const userRef = db.collection('users').doc(uid);
  const settingsRef = db.collection('userSettings').doc(uid);

  const userUpdates: Record<string, unknown> = { updatedAt: now };
  const settingsUpdates: Record<string, unknown> = { updatedAt: now };

  if (input.nickname !== undefined) {
    const nickname = input.nickname.trim();
    if (!nickname || nickname.length > 30) {
      throw new Error('INVALID_NICKNAME');
    }
    userUpdates.nickname = nickname;

    const app = getAdminApp();
    if (app) {
      await getAuth(app).updateUser(uid, { displayName: nickname });
    }
  }

  if (input.notifyEmailAgreed !== undefined) {
    settingsUpdates.notifyEmailAgreed = input.notifyEmailAgreed === true;
  }

  if (input.marketingAgreed !== undefined) {
    userUpdates.marketingAgreed = input.marketingAgreed === true;
    userUpdates.marketingAgreedAt = input.marketingAgreed ? now : null;
  }

  const batch = db.batch();
  if (Object.keys(userUpdates).length > 1) {
    batch.set(userRef, userUpdates, { merge: true });
  }
  if (Object.keys(settingsUpdates).length > 1) {
    batch.set(settingsRef, settingsUpdates, { merge: true });
  }
  await batch.commit();

  const account = await getUserAccount(uid);
  if (!account) {
    throw new Error('USER_NOT_FOUND');
  }

  return account;
}

export async function deleteUserAccount(uid: string): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error('Firestore Admin not available');

  const batch = db.batch();
  batch.delete(db.collection('userSettings').doc(uid));
  batch.delete(db.collection('users').doc(uid));
  await batch.commit();

  const app = getAdminApp();
  if (app) {
    await getAuth(app).deleteUser(uid);
  }
}

function serializeTimestamp(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  if ('toDate' in value && typeof value.toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export async function listUserAccounts(limit = 200): Promise<AdminUserListItem[]> {
  const db = getAdminFirestore();
  if (!db) return [];

  const snap = await db.collection('users').limit(limit).get();
  const items = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      email: (data.email as string | null) ?? null,
      nickname:
        typeof data.nickname === 'string' && data.nickname.trim() ? data.nickname.trim() : '사용자',
      provider: (data.provider as UserProvider) ?? 'email',
      role: (data.role as UserProfile['role']) ?? 'user',
      status: (data.status as UserProfile['status']) ?? 'active',
      createdAt: serializeTimestamp(data.createdAt),
    } satisfies AdminUserListItem;
  });

  items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return items;
}

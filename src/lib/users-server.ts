import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { parseBizVerifyRecord, type BizVerifyRecord } from '@/lib/biz-verify-store';
import { getAdminApp, getAdminFirestore } from '@/lib/firebaseAdmin';
import { deleteStoredJobPostingsByOwner } from '@/lib/jobs-server';
import { parseFirestoreTimestamp } from '@/lib/firestore-timestamp';
import { parseJobAlertPrefs } from '@/lib/job-alert-prefs-server';
import { omitUndefined } from '@/lib/omit-undefined';
import { deleteStoredTalentProfilesByOwner } from '@/lib/talents-server';
import type { UserProfile, UserProvider, UserSettings, AdminUserListItem } from '@/types/user';

export type UserAccount = {
  profile: UserProfile;
  settings: UserSettings;
  marketingAgreed: boolean;
  company: BizVerifyRecord | null;
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
    company: parseBizVerifyRecord(userData.company),
  };
}

export type UpdateUserAccountInput = {
  nickname?: string;
  marketingAgreed?: boolean;
  notifyEmailAgreed?: boolean;
  company?: BizVerifyRecord;
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
    const existingSnap = await userRef.get();
    const existingNickname =
      typeof existingSnap.data()?.nickname === 'string' ? existingSnap.data()!.nickname.trim() : '';
    if (existingNickname) {
      throw new Error('NICKNAME_LOCKED');
    }

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

  if (input.company !== undefined) {
    userUpdates.company = omitUndefined({ ...input.company } as Record<string, unknown>);
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

  await deleteStoredJobPostingsByOwner(uid);
  await deleteStoredTalentProfilesByOwner(uid);

  const batch = db.batch();
  batch.delete(db.collection('userSettings').doc(uid));
  batch.delete(db.collection('users').doc(uid));
  batch.delete(db.collection('jobAlertPrefs').doc(uid));

  const bookmarksSnap = await db.collection('jobBookmarks').where('userId', '==', uid).get();
  for (const doc of bookmarksSnap.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();

  const app = getAdminApp();
  if (app) {
    try {
      await getAuth(app).deleteUser(uid);
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
      if (!code.includes('user-not-found')) throw error;
    }
  }
}

function serializeTimestamp(value: unknown): string | null {
  return parseFirestoreTimestamp(value);
}

function providerFromAuthUser(providerData: Array<{ providerId: string }> | undefined): UserProvider {
  const ids = providerData?.map((item) => item.providerId) ?? [];
  if (ids.includes('google.com')) return 'google';
  if (ids.some((id) => id.includes('kakao'))) return 'kakao';
  if (ids.some((id) => id.includes('naver'))) return 'naver';
  return 'email';
}

export async function listUserAccounts(limit = 200): Promise<AdminUserListItem[]> {
  const app = getAdminApp();
  const db = getAdminFirestore();
  if (!app || !db) return [];

  const byId = new Map<string, AdminUserListItem>();
  const snap = await db.collection('users').limit(limit).get();
  for (const doc of snap.docs) {
    const data = doc.data();
    byId.set(doc.id, {
      id: doc.id,
      email: (data.email as string | null) ?? null,
      nickname:
        typeof data.nickname === 'string' && data.nickname.trim() ? data.nickname.trim() : '사용자',
      provider: (data.provider as UserProvider) ?? 'email',
      role: (data.role as UserProfile['role']) ?? 'user',
      status: (data.status as UserProfile['status']) ?? 'active',
      createdAt: serializeTimestamp(data.createdAt),
      lastLoginAt: serializeTimestamp(data.lastActiveAt),
      jobAlertPrefsUpdatedAt: null,
    });
  }

  try {
    const authUsers = await getAuth(app).listUsers(limit);
    for (const user of authUsers.users) {
      const existing = byId.get(user.uid);
      const lastSignInAt = user.metadata.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).toISOString()
        : null;

      if (existing) {
        if (!existing.email && user.email) existing.email = user.email;
        if (!existing.lastLoginAt && lastSignInAt) existing.lastLoginAt = lastSignInAt;
        continue;
      }
      byId.set(user.uid, {
        id: user.uid,
        email: user.email ?? null,
        nickname: user.displayName?.trim() || user.email?.split('@')[0] || '사용자',
        provider: providerFromAuthUser(user.providerData),
        role: 'user',
        status: user.disabled ? 'suspended' : 'active',
        createdAt: user.metadata.creationTime
          ? new Date(user.metadata.creationTime).toISOString()
          : null,
        lastLoginAt: lastSignInAt,
        jobAlertPrefsUpdatedAt: null,
      });
    }
  } catch (error) {
    console.error('[admin-users] list Auth users failed', error);
  }

  const userIds = [...byId.keys()];
  const prefsByUid = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const prefRefs = userIds.map((id) => db.collection('jobAlertPrefs').doc(id));
    const prefSnaps = await db.getAll(...prefRefs);
    for (const doc of prefSnaps) {
      if (doc.exists) {
        prefsByUid.set(doc.id, doc.data() as Record<string, unknown>);
      }
    }
  }

  for (const user of byId.values()) {
    const raw = prefsByUid.get(user.id);
    const prefs = parseJobAlertPrefs(user.id, raw);
    user.jobAlertPrefsUpdatedAt = raw && prefs.updatedAt ? prefs.updatedAt : null;
  }

  return [...byId.values()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

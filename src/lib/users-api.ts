import type { User } from 'firebase/auth';
import type { UserProfile, UserSettings } from '@/types/user';

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message?: string } };

export type UserAccountData = {
  profile: UserProfile;
  settings: UserSettings;
  marketingAgreed: boolean;
};

export type UpdateUserAccountPayload = {
  nickname?: string;
  marketingAgreed?: boolean;
  notifyEmailAgreed?: boolean;
};

async function authFetch<T>(
  user: User,
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  return res.json() as Promise<ApiResponse<T>>;
}

export async function fetchUserAccount(user: User) {
  return authFetch<UserAccountData>(user, '/api/users/me');
}

export async function updateUserAccount(user: User, payload: UpdateUserAccountPayload) {
  return authFetch<UserAccountData>(user, '/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteUserAccount(user: User) {
  const token = await user.getIdToken(true);
  const res = await fetch('/api/users/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.json() as Promise<ApiResponse<{ deleted: boolean }>>;
}

import { getClientAuth } from '@/lib/firebase';
import type { JobPosting } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

async function authRequest(path: string, method: 'PUT' | 'DELETE', body?: unknown): Promise<void> {
  const user = getClientAuth()?.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function syncMyJobPosting(job: JobPosting): Promise<void> {
  try {
    await authRequest('/api/jobs', 'PUT', job);
  } catch {
    // 로컬 저장은 이미 끝난 상태입니다.
  }
}

export async function syncMyTalentProfile(profile: TalentProfile): Promise<void> {
  try {
    await authRequest('/api/talents', 'PUT', profile);
  } catch {
    // 로컬 저장은 이미 끝난 상태입니다.
  }
}

export async function syncDeleteTalentProfile(profileId: string): Promise<void> {
  try {
    await authRequest(`/api/talents?id=${encodeURIComponent(profileId)}`, 'DELETE');
  } catch {
    // 로컬 삭제는 이미 끝난 상태입니다.
  }
}

export async function syncDeleteJobPosting(jobId: string): Promise<void> {
  try {
    await authRequest(`/api/jobs/${encodeURIComponent(jobId)}`, 'DELETE');
  } catch {
    // 로컬 삭제는 이미 끝난 상태입니다.
  }
}

import { getClientAuth } from '@/lib/firebase';
import type { JobPosting } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

async function authPut(path: string, body: unknown): Promise<void> {
  const user = getClientAuth()?.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

export async function syncMyJobPosting(job: JobPosting): Promise<void> {
  try {
    await authPut('/api/jobs', job);
  } catch {
    // 로컬 저장은 이미 끝난 상태입니다.
  }
}

export async function syncMyTalentProfile(profile: TalentProfile): Promise<void> {
  try {
    await authPut('/api/talents', profile);
  } catch {
    // 로컬 저장은 이미 끝난 상태입니다.
  }
}

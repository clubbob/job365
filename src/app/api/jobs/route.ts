import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { getStoredJobPosting, upsertStoredJobPosting } from '@/lib/jobs-server';
import type { JobPosting } from '@/types/job';

async function requireUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 }) };
  }
  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return { error: NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 }) };
  }
  return { uid: decoded.uid };
}

export async function PUT(request: Request) {
  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const job = (await request.json()) as JobPosting;
    if (!job?.id || !job.title) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_JOB', message: '채용 정보가 올바르지 않습니다.' } },
        { status: 400 },
      );
    }
    const existing = await getStoredJobPosting(job.id);
    if (existing && existing.ownerId !== auth.uid) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    const saved = await upsertStoredJobPosting(auth.uid, job);
    return NextResponse.json({ ok: true, data: saved });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'SAVE_FAILED', message: '채용 정보를 저장하지 못했습니다.' } },
      { status: 500 },
    );
  }
}

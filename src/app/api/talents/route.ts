import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { deleteStoredTalentProfile, getStoredTalentProfile, upsertStoredTalentProfile } from '@/lib/talents-server';
import type { TalentProfile } from '@/types/talent';

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
    const profile = (await request.json()) as TalentProfile;
    if (!profile?.id || !profile.name) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_PROFILE', message: '이력서가 올바르지 않습니다.' } },
        { status: 400 },
      );
    }
    const existing = await getStoredTalentProfile(profile.id);
    if (existing && existing.ownerId !== auth.uid) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    const saved = await upsertStoredTalentProfile(auth.uid, profile);
    return NextResponse.json({ ok: true, data: saved });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'SAVE_FAILED', message: '이력서를 저장하지 못했습니다.' } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ID', message: '이력서를 찾을 수 없습니다.' } },
      { status: 400 },
    );
  }

  try {
    const existing = await getStoredTalentProfile(id);
    if (!existing) {
      return NextResponse.json({ ok: true, data: { deleted: true } });
    }
    if (existing.ownerId !== auth.uid) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }
    await deleteStoredTalentProfile(id);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'DELETE_FAILED', message: '이력서를 삭제하지 못했습니다.' } },
      { status: 500 },
    );
  }
}

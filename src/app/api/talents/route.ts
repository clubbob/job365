import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { upsertStoredTalentProfile } from '@/lib/talents-server';
import type { TalentProfile } from '@/types/talent';

export async function PUT(request: Request) {
  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }
  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 });
  }

  try {
    const profile = (await request.json()) as TalentProfile;
    if (!profile?.id || !profile.name) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_PROFILE', message: '이력서가 올바르지 않습니다.' } },
        { status: 400 },
      );
    }
    const saved = await upsertStoredTalentProfile(decoded.uid, profile);
    return NextResponse.json({ ok: true, data: saved });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'SAVE_FAILED', message: '이력서를 저장하지 못했습니다.' } },
      { status: 500 },
    );
  }
}

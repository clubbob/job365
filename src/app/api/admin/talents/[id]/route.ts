import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import {
  deleteStoredTalentProfile,
  getStoredTalentProfile,
  upsertStoredTalentProfile,
} from '@/lib/talents-server';
import type { TalentProfile } from '@/types/talent';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: true, data: { item: null, firebaseReady: false } });
  }

  const { id } = await params;
  const item = await getStoredTalentProfile(decodeURIComponent(id));
  if (!item) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: '이력서를 찾을 수 없습니다.' } }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { item, firebaseReady: true } });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  const { id } = await params;
  const existing = await getStoredTalentProfile(decodeURIComponent(id));
  if (!existing) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: '이력서를 찾을 수 없습니다.' } }, { status: 404 });
  }

  const profile = (await request.json()) as TalentProfile;
  const saved = await upsertStoredTalentProfile(existing.ownerId, { ...profile, id: existing.profile.id });
  return NextResponse.json({ ok: true, data: saved });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  const { id } = await params;
  const deleted = await deleteStoredTalentProfile(decodeURIComponent(id));
  if (!deleted) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: '이력서를 찾을 수 없습니다.' } }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { deleted: true } });
}

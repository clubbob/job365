import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import {
  deleteStoredJobPosting,
  getStoredJobPosting,
  upsertStoredJobPosting,
} from '@/lib/jobs-server';
import type { JobPosting } from '@/types/job';

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
  const item = await getStoredJobPosting(id);
  if (!item) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: '채용 정보를 찾을 수 없습니다.' } }, { status: 404 });
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
  const existing = await getStoredJobPosting(id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: '채용 정보를 찾을 수 없습니다.' } }, { status: 404 });
  }

  const job = (await request.json()) as JobPosting;
  const saved = await upsertStoredJobPosting(existing.ownerId, { ...job, id });
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
  const deleted = await deleteStoredJobPosting(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: '채용 정보를 찾을 수 없습니다.' } }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { deleted: true } });
}

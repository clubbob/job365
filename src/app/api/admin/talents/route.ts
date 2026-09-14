import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { listStoredTalentProfiles } from '@/lib/talents-server';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: true, data: { talents: [], ...firebaseAdminListFields() } });
  }

  const talents = await listStoredTalentProfiles();
  return NextResponse.json({ ok: true, data: { talents, ...firebaseAdminListFields() } });
}

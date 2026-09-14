import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { listStoredJobPostings } from '@/lib/jobs-server';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: true, data: { jobs: [], ...firebaseAdminListFields() } });
  }

  const jobs = await listStoredJobPostings();
  return NextResponse.json({ ok: true, data: { jobs, ...firebaseAdminListFields() } });
}

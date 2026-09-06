import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { getAdminFirestore, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

type SignupConsentsBody = {
  marketingAgreed?: boolean;
};

export async function POST(request: Request) {
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

  let body: SignupConsentsBody = {};
  try {
    body = (await request.json()) as SignupConsentsBody;
  } catch {
    body = {};
  }

  const marketingAgreed = body.marketingAgreed === true;
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  const now = FieldValue.serverTimestamp();
  const userRef = db.collection('users').doc(decoded.uid);
  const payload: Record<string, unknown> = {
    termsAgreedAt: now,
    privacyAgreedAt: now,
    marketingAgreed,
    marketingAgreedAt: marketingAgreed ? now : null,
    updatedAt: now,
  };

  await userRef.set(payload, { merge: true });

  return NextResponse.json({ ok: true });
}

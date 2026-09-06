import { NextResponse } from 'next/server';
import { touchUserLastActive, upsertUserFromAuth, verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { notifyAdminNewSignup } from '@/lib/signup-email-server';
import { getUserAccount } from '@/lib/users-server';
import type { UserProvider } from '@/types/user';

function resolveProvider(firebaseProvider: string): UserProvider {
  if (firebaseProvider === 'google.com') return 'google';
  if (firebaseProvider === 'password') return 'email';
  if (firebaseProvider === 'oidc.kakao' || firebaseProvider === 'kakao.com') return 'kakao';
  if (firebaseProvider === 'oidc.naver' || firebaseProvider === 'naver.com') return 'naver';
  return 'email';
}

export async function POST(request: Request) {
  if (!isFirebaseAdminReady()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'ADMIN_NOT_CONFIGURED',
          message:
            'Firebase Admin 설정이 없습니다. .env.local의 FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY를 확인해 주세요.',
        },
      },
      { status: 503 },
    );
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  try {
    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 });
    }

    const provider = resolveProvider(
      (decoded.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider ??
        'password',
    );

    const { user, isNewUser } = await upsertUserFromAuth({
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      provider,
    });
    await touchUserLastActive(decoded.uid);

    if (isNewUser) {
      const nickname =
        (typeof user?.nickname === 'string' && user.nickname.trim()) ||
        decoded.name?.trim() ||
        decoded.email?.split('@')[0] ||
        '사용자';

      await notifyAdminNewSignup({
        uid: decoded.uid,
        email: decoded.email ?? null,
        nickname,
        provider,
      });
    }

    const account = await getUserAccount(decoded.uid);
    if (account?.profile.status === 'suspended') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: '이용이 중단된 계정입니다. 관리자에게 문의해 주세요.',
          },
        },
        { status: 403 },
      );
    }

    const needsConsent = !user?.termsAgreedAt;

    return NextResponse.json({ ok: true, data: { user, needsConsent } });
  } catch (error) {
    console.error('[auth/sync] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SYNC_FAILED',
          message: '사용자 정보 동기화에 실패했습니다.',
        },
      },
      { status: 500 },
    );
  }
}

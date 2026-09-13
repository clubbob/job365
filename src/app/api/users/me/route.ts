import { NextResponse } from 'next/server';
import { upsertUserFromAuth, verifyIdToken } from '@/lib/auth-server';
import { parseBizVerifyRecord } from '@/lib/biz-verify-store';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { notifyAdminNewSignup } from '@/lib/signup-email-server';
import {
  deleteUserAccount,
  getUserAccount,
  updateUserAccount,
  type UpdateUserAccountInput,
} from '@/lib/users-server';
import type { UserProvider } from '@/types/user';

function resolveProvider(firebaseProvider: string): UserProvider {
  if (firebaseProvider === 'google.com') return 'google';
  if (firebaseProvider === 'password') return 'email';
  return 'email';
}

async function ensureUserAccount(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 }) };

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return { error: NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 }) };
  }

  let account = await getUserAccount(decoded.uid);
  if (!account) {
    const provider = resolveProvider(
      (decoded.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider ?? 'password',
    );
    const { isNewUser } = await upsertUserFromAuth({
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      provider,
    });

    if (isNewUser) {
      const nickname = decoded.name?.trim() || decoded.email?.split('@')[0] || '사용자';
      await notifyAdminNewSignup({
        uid: decoded.uid,
        email: decoded.email ?? null,
        nickname,
        provider,
      });
    }

    account = await getUserAccount(decoded.uid);
  }

  if (!account) {
    return {
      error: NextResponse.json(
        { ok: false, error: { code: 'USER_NOT_FOUND', message: '사용자 정보를 찾을 수 없습니다.' } },
        { status: 404 },
      ),
    };
  }

  return { account, uid: decoded.uid };
}

export async function GET(request: Request) {
  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  try {
    const result = await ensureUserAccount(request);
    if ('error' in result && result.error) return result.error;

    return NextResponse.json({ ok: true, data: result.account });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'FETCH_FAILED', message: '계정 정보를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

function parseUpdateBody(body: unknown): UpdateUserAccountInput | null {
  if (!body || typeof body !== 'object') return null;

  const data = body as Record<string, unknown>;
  const patch: UpdateUserAccountInput = {};

  if (data.nickname !== undefined) {
    if (typeof data.nickname !== 'string') return null;
    patch.nickname = data.nickname;
  }

  if (data.marketingAgreed !== undefined) {
    if (typeof data.marketingAgreed !== 'boolean') return null;
    patch.marketingAgreed = data.marketingAgreed;
  }

  if (data.notifyEmailAgreed !== undefined) {
    if (typeof data.notifyEmailAgreed !== 'boolean') return null;
    patch.notifyEmailAgreed = data.notifyEmailAgreed;
  }

  if (data.company !== undefined) {
    const company = parseBizVerifyRecord(data.company);
    if (!company) return null;
    patch.company = company;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

export async function PATCH(request: Request) {
  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_BODY' } }, { status: 400 });
  }

  const patch = parseUpdateBody(body);
  if (!patch) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_BODY' } }, { status: 400 });
  }

  try {
    const result = await ensureUserAccount(request);
    if ('error' in result && result.error) return result.error;

    const account = await updateUserAccount(result.uid, patch);
    return NextResponse.json({ ok: true, data: account });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_NICKNAME') {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_NICKNAME', message: '닉네임은 1~30자로 입력해 주세요.' } },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'UPDATE_FAILED', message: '계정 정보를 저장하지 못했습니다.' } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'ADMIN_NOT_CONFIGURED' } }, { status: 503 });
  }

  try {
    const result = await ensureUserAccount(request);
    if ('error' in result && result.error) return result.error;

    if (result.account.profile.role === 'admin') {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'ADMIN_CANNOT_WITHDRAW', message: '관리자 계정은 탈퇴할 수 없습니다.' },
        },
        { status: 403 },
      );
    }

    await deleteUserAccount(result.uid);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth/user-not-found')) {
      return NextResponse.json({ ok: true, data: { deleted: true } });
    }

    return NextResponse.json(
      { ok: false, error: { code: 'DELETE_FAILED', message: '회원 탈퇴에 실패했습니다.' } },
      { status: 500 },
    );
  }
}

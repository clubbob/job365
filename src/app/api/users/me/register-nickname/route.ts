import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyIdToken } from '@/lib/auth-server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { DEFAULT_JOB_ALERT_PREFS } from '@/types/job-alert-prefs';

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;

function normalizeNickname(value: string): string {
  return value.trim();
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 });
  }

  const body = (await request.json()) as { nickname?: string };
  const nickname = normalizeNickname(body.nickname ?? '');

  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_NICKNAME',
          message: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`,
        },
      },
      { status: 400 },
    );
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: { code: 'ADMIN_NOT_CONFIGURED', message: '서버 설정을 확인해 주세요.' } },
      { status: 503 },
    );
  }

  const userRef = db.collection('users').doc(decoded.uid);
  const prefsRef = db.collection('jobAlertPrefs').doc(decoded.uid);

  try {
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const prefsSnap = await tx.get(prefsRef);
      const existingNickname =
        typeof userSnap.data()?.nickname === 'string' ? userSnap.data()!.nickname.trim() : '';

      if (existingNickname) {
        if (existingNickname === nickname) return;
        throw new Error('NICKNAME_LOCKED');
      }

      const dupSnap = await tx.get(
        db.collection('users').where('nickname', '==', nickname).limit(1),
      );

      if (!dupSnap.empty && dupSnap.docs[0]?.id !== decoded.uid) {
        throw new Error('NICKNAME_TAKEN');
      }

      tx.set(
        userRef,
        {
          nickname,
          email: decoded.email ?? null,
          provider: 'email',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (!prefsSnap.exists) {
        tx.set(prefsRef, {
          userId: decoded.uid,
          ...DEFAULT_JOB_ALERT_PREFS,
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'NICKNAME_LOCKED') {
      return NextResponse.json(
        { ok: false, error: { code: 'NICKNAME_LOCKED', message: '닉네임은 가입 후 변경할 수 없습니다.' } },
        { status: 409 },
      );
    }
    if (message === 'NICKNAME_TAKEN') {
      return NextResponse.json(
        { ok: false, error: { code: 'NICKNAME_TAKEN', message: '이미 사용 중인 닉네임입니다.' } },
        { status: 409 },
      );
    }
    console.error('[register-nickname] failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'REGISTER_FAILED', message: '닉네임 등록에 실패했습니다.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: { nickname } });
}

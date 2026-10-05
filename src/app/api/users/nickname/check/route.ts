import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;

function normalizeNickname(value: string): string {
  return value.trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nickname = normalizeNickname(searchParams.get('nickname') ?? '');

  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return NextResponse.json({
      ok: true,
      data: {
        available: false,
        reason: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`,
      },
    });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: { code: 'ADMIN_NOT_CONFIGURED', message: '서버 설정을 확인해 주세요.' } },
      { status: 503 },
    );
  }

  const snap = await db
    .collection('users')
    .where('nickname', '==', nickname)
    .limit(1)
    .get();

  const available = snap.empty;

  return NextResponse.json({
    ok: true,
    data: {
      available,
      reason: available ? null : '이미 사용 중인 닉네임입니다.',
    },
  });
}

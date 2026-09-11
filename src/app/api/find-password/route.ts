import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin';
import { isEmailServiceConfigured, sendNaverEmail } from '@/lib/naver-smtp';
import {
  buildPasswordResetEmailHtml,
  resolvePublicBaseUrl,
  toCustomResetUrl,
} from '@/lib/password-reset-server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 주소를 입력해 주세요.' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    if (!adminApp) {
      return NextResponse.json(
        {
          error: '비밀번호 찾기 메일 설정이 필요합니다. 관리자에게 Firebase Admin 설정을 요청해 주세요.',
          fallback: 'firebase-client',
        },
        { status: 503 },
      );
    }

    const auth = getAuth(adminApp);

    try {
      await auth.getUserByEmail(email);
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: '입력하신 이메일로 가입된 계정을 찾을 수 없습니다.' },
          { status: 404 },
        );
      }
      throw error;
    }

    if (!isEmailServiceConfigured()) {
      return NextResponse.json(
        {
          error: '이메일 발송 설정이 필요합니다. 잠시 후 다시 시도해 주세요.',
          fallback: 'firebase-client',
        },
        { status: 503 },
      );
    }

    const baseUrl = resolvePublicBaseUrl(req);
    const continueUrl = `${baseUrl}/login`;
    const firebaseResetLink = await auth.generatePasswordResetLink(email, {
      url: continueUrl,
      handleCodeInApp: false,
    });
    const resetLink = toCustomResetUrl(baseUrl, firebaseResetLink);

    const subject = '[JobLink 365] 비밀번호 재설정 안내';
    const text = `안녕하세요.\n\n요청하신 비밀번호 재설정 링크입니다.\n아래 링크에서 새 비밀번호를 설정해 주세요.\n\n${resetLink}\n\n본인이 요청하지 않았다면 이 메일을 무시해 주세요.\n`;
    const html = buildPasswordResetEmailHtml(resetLink);

    const result = await sendNaverEmail({ to: email, subject, text, html });
    if (!result.success) {
      return NextResponse.json(
        { error: `이메일 발송에 실패했습니다. (${result.message})` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: '입력하신 이메일로 비밀번호 재설정 안내 메일을 보냈습니다. (1~2분 소요될 수 있어요)',
    });
  } catch (error) {
    console.error('[find-password] failed', error);
    return NextResponse.json({ error: '비밀번호 찾기 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

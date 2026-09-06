'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { isValidEmail } from '@/features/auth/auth-errors';
import {
  AUTH_CARD,
  authInputClassName,
  authLinkClassName,
  authPrimaryButtonClassName,
} from '@/lib/auth-ui';

export default function ForgotPasswordPageClient() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/find-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        fallback?: string;
      };

      if (response.ok) {
        setMessage(
          data.message ||
            '입력하신 이메일로 비밀번호 재설정 안내 메일을 보냈습니다. (1~2분 소요될 수 있어요)',
        );
        return;
      }

      if (data.fallback === 'firebase-client') {
        await sendPasswordReset(normalizedEmail);
        setMessage(
          '입력하신 이메일로 비밀번호 재설정 안내 메일을 보냈습니다. (1~2분 소요될 수 있어요)',
        );
        return;
      }

      setErrorMessage(data.error || '비밀번호 찾기에 실패했습니다.');
    } catch {
      setErrorMessage('요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={AUTH_CARD}>
      <h1 className="text-2xl font-bold text-foreground">비밀번호 찾기</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
      </p>

      {message ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="이메일"
          className={authInputClassName}
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className={authPrimaryButtonClassName}
        >
          {isSubmitting ? '확인 중...' : '비밀번호 재설정 메일 받기'}
        </button>
      </form>

      <Link href="/login" className={`mt-6 inline-block ${authLinkClassName}`}>
        로그인으로 돌아가기
      </Link>
    </div>
  );
}

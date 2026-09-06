'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { confirmPasswordReset } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase';
import {
  AUTH_CARD,
  authInputClassName,
  authLinkClassName,
  authPrimaryButtonClassName,
} from '@/lib/auth-ui';

function PasswordResetForm() {
  const searchParams = useSearchParams();
  const oobCode = searchParams?.get('oobCode');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setErrorMsg('유효하지 않은 접근입니다.');
    }
  }, [oobCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');

    if (!oobCode) return;

    if (password !== passwordConfirm) {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    const auth = getClientAuth();
    if (!auth) {
      setErrorMsg('Firebase가 설정되지 않았습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage('비밀번호가 성공적으로 변경되었습니다.');
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMsg('비밀번호 재설정에 실패했습니다. 링크가 만료되었을 수 있습니다.');
      } else {
        setErrorMsg('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={AUTH_CARD}>
      <h1 className="text-2xl font-bold text-foreground">새 비밀번호 설정</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        새 비밀번호를 입력하고 변경을 완료해 주세요.
      </p>

      {message ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {message ? (
        <Link href="/login" className={`mt-6 inline-block ${authLinkClassName}`}>
          로그인으로 돌아가기
        </Link>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            type="password"
            autoComplete="new-password"
            placeholder="새 비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClassName}
            required
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={authInputClassName}
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !oobCode}
            className={authPrimaryButtonClassName}
          >
            {isSubmitting ? '처리 중...' : '비밀번호 변경'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordConfirmPageClient() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">불러오는 중…</p>}>
      <PasswordResetForm />
    </Suspense>
  );
}

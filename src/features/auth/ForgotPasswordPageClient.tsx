'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { useAuth } from '@/features/auth/auth-context';
import { isValidEmail } from '@/features/auth/auth-errors';
import { authFormInputClassName, authLinkClassName } from '@/lib/auth-ui';

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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="비밀번호 찾기"
        description="가입한 이메일로 비밀번호 재설정 링크를 보내 드립니다."
        showRefresh={false}
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <FieldLabel htmlFor="forgot-password-email" required>이메일</FieldLabel>
            <input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="가입한 이메일"
              className={authFormInputClassName}
              required
            />
          </div>
          {errorMessage ? <FormFeedback variant="error">{errorMessage}</FormFeedback> : null}
          {message ? <FormFeedback variant="success">{message}</FormFeedback> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '확인 중…' : '비밀번호 재설정 메일 받기'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/login" className={authLinkClassName}>
            로그인으로 돌아가기
          </Link>
        </p>
      </Card>
    </div>
  );
}

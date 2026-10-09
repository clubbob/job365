'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-context';
import { getSafeReturnPath } from '@/lib/auth-return';
import { authFormInputClassName } from '@/lib/auth-ui';
import { loadRememberedLoginEmail, saveRememberedLoginEmail } from '@/lib/login-email-storage';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = getSafeReturnPath(searchParams.get('next'));
  const { user, loading, needsConsent, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const saved = loadRememberedLoginEmail();
    setEmail(saved.email);
    setRememberEmail(saved.remember);
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    if (needsConsent) {
      const next = returnPath === '/' ? '' : `?next=${encodeURIComponent(returnPath)}`;
      router.replace(`/signup/consent${next}`);
      return;
    }

    router.replace(returnPath);
  }, [user, loading, needsConsent, returnPath, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setPending(true);
    try {
      await signInWithEmail(email, password);
      saveRememberedLoginEmail(email, rememberEmail);
    } catch (err) {
      setError(getAuthErrorMessage(err, '로그인에 실패했습니다.'));
    } finally {
      setPending(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="로그인"
          description={
            needsConsent
              ? '약관 동의 페이지로 이동 중입니다.'
              : user
                ? '로그인되었습니다. 이동 중입니다.'
                : '불러오는 중…'
          }
          showRefresh={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="로그인" description="이메일과 비밀번호로 로그인하세요." showRefresh={false} />

      <Card>
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="login-email" required>이메일</FieldLabel>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFormInputClassName}
              required
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <FieldLabel htmlFor="login-password" required className="mb-0">
                비밀번호
              </FieldLabel>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                비밀번호 찾기
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFormInputClassName}
              required
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
              className="rounded border-border-strong"
            />
            이메일 저장
          </label>

          {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}

          <Button type="submit" disabled={pending}>
            {pending ? '로그인 중…' : '로그인'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          계정이 없나요?{' '}
          <Link
            href={`/signup${returnPath !== '/' ? `?next=${encodeURIComponent(returnPath)}` : ''}`}
            className="font-semibold text-primary hover:underline"
          >
            회원가입
          </Link>
        </p>
      </Card>
    </div>
  );
}

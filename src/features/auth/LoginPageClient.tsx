'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card } from '@/components/ui/Card';
import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-context';
import { getSafeReturnPath } from '@/lib/auth-return';

const inputClassName =
  'h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = getSafeReturnPath(searchParams.get('next'));
  const { user, loading, needsConsent, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-foreground">이메일</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-foreground">비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              required
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? '로그인 중…' : '로그인'}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            비밀번호 찾기
          </Link>
          <Link href={`/signup${returnPath !== '/' ? `?next=${encodeURIComponent(returnPath)}` : ''}`} className="font-semibold text-primary hover:underline">
            회원가입
          </Link>
        </div>
      </Card>
    </div>
  );
}

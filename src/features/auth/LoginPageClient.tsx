'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { getSafeReturnPath } from '@/lib/auth-return';
import { consumeGoogleAuthError, consumeGoogleAuthReturn } from '@/lib/google-auth-flow';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = getSafeReturnPath(searchParams.get('next'));
  const { user, loading, needsConsent, signInWithGoogle } = useAuth();
  const { resetMode } = useUserMode();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const redirectError = consumeGoogleAuthError();
    if (redirectError) setError(redirectError);
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    const savedReturn = consumeGoogleAuthReturn();
    const destination = savedReturn ?? returnPath;

    if (needsConsent) {
      const next = destination === '/' ? '' : `?next=${encodeURIComponent(destination)}`;
      router.replace(`/signup/consent${next}`);
      return;
    }

    resetMode();
    router.replace(destination);
  }, [user, loading, needsConsent, returnPath, router, resetMode]);

  async function handleGoogleLogin() {
    setError(null);
    setPending(true);

    try {
      const needsConsentAfterGoogle = await signInWithGoogle(returnPath);
      if (needsConsentAfterGoogle) {
        const next = returnPath === '/' ? '' : `?next=${encodeURIComponent(returnPath)}`;
        router.replace(`/signup/consent${next}`);
        return;
      }
      resetMode();
      router.push(returnPath);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Google 로그인에 실패했습니다.'));
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
      <PageHeader
        title="로그인"
        description="구글, 카카오톡, 네이버 중 하나로 로그인하세요."
        showRefresh={false}
      />

      <Card>
        <SocialAuthButtons
          googleLabel="Google로 로그인"
          kakaoLabel="카카오톡으로 로그인"
          naverLabel="네이버로 로그인"
          pending={pending}
          onGoogleClick={handleGoogleLogin}
        />

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </Card>
    </div>
  );
}

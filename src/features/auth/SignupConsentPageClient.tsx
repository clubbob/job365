'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SignupConsent, {
  createSignupConsentState,
  isRequiredSignupConsentMet,
} from '@/components/auth/SignupConsent';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/auth-context';
import { getSafeReturnPath } from '@/lib/auth-return';
import { saveSignupConsents } from '@/lib/signup-consents-client';
import { useUserMode } from '@/features/mode/mode-context';

export default function SignupConsentPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = getSafeReturnPath(searchParams.get('next'));
  const { user, loading, refreshConsentStatus } = useAuth();
  const { resetMode } = useUserMode();
  const [consent, setConsent] = useState(createSignupConsentState);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const requiredConsentsMet = isRequiredSignupConsentMet(consent);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!requiredConsentsMet) {
      setError('필수 약관에 모두 동의해 주세요.');
      return;
    }

    setPending(true);
    try {
      const saved = await saveSignupConsents(consent.agreedMarketing);
      if (!saved) {
        setError('약관 동의 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      await refreshConsentStatus();
      resetMode();
      router.push(returnPath);
    } catch {
      setError('약관 동의 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  }

  if (loading || !user) {
    return <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="약관 동의"
        description={
          user.email
            ? `서비스 이용을 위해 필수 약관에 동의해 주세요. ${user.email}`
            : '서비스 이용을 위해 필수 약관에 동의해 주세요.'
        }
        showRefresh={false}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SignupConsent value={consent} onChange={setConsent} />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" fullWidth disabled={pending || !requiredConsentsMet}>
            동의하고 시작하기
          </Button>
        </form>
      </Card>
    </div>
  );
}

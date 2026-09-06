import { Suspense } from 'react';
import SignupConsentPageClient from '@/features/auth/SignupConsentPageClient';

export default function SignupConsentPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">불러오는 중…</p>}>
      <SignupConsentPageClient />
    </Suspense>
  );
}

import { Suspense } from 'react';
import SignupPageClient from '@/features/auth/SignupPageClient';

export default function SignupPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">불러오는 중…</p>}>
      <SignupPageClient />
    </Suspense>
  );
}

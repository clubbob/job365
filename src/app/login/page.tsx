import { Suspense } from 'react';
import LoginPageClient from '@/features/auth/LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">불러오는 중…</p>}>
      <LoginPageClient />
    </Suspense>
  );
}

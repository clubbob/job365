import type { Metadata } from 'next';
import ResetPasswordConfirmPageClient from '@/features/auth/ResetPasswordConfirmPageClient';

export const metadata: Metadata = {
  title: '새 비밀번호 설정',
};

export default function ResetPasswordConfirmPage() {
  return <ResetPasswordConfirmPageClient />;
}

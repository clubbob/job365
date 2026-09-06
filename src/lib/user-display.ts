import type { User } from 'firebase/auth';
import type { UserProvider } from '@/types/user';

export function getUserNicknameFallback(user: User): string {
  const fromName = user.displayName?.trim();
  if (fromName) return fromName;

  const email = user.email?.trim();
  if (email) {
    const local = email.split('@')[0]?.trim();
    if (local) return local;
  }

  return '사용자';
}

export function formatMyPageLabel(nickname: string): string {
  return `마이페이지 (${nickname})`;
}

const PROVIDER_LABELS: Record<UserProvider, string> = {
  email: '이메일',
  google: 'Google',
  kakao: '카카오',
  naver: '네이버',
};

export function getProviderLabel(provider: UserProvider): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

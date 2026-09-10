import { FirebaseError } from 'firebase/app';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/invalid-email': '올바른 이메일 주소를 입력해 주세요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/user-not-found': '등록되지 않은 이메일이거나 비밀번호가 올바르지 않습니다.',
  'auth/wrong-password': '등록되지 않은 이메일이거나 비밀번호가 올바르지 않습니다.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/requires-recent-login': '현재 비밀번호가 올바르지 않습니다.',
  'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'auth/network-request-failed': '네트워크 오류가 발생했습니다.',
  'auth/popup-closed-by-user': '계정 확인을 완료하지 않았습니다.',
  'auth/cancelled-popup-request': '계정 확인을 완료하지 않았습니다.',
  'auth/unauthorized-domain': '이 도메인은 Firebase에 허용되지 않았습니다. Authentication → Settings → Authorized domains에 localhost와 joblink365.com을 추가해 주세요.',
  'auth/operation-not-allowed': 'Google 로그인이 아직 켜져 있지 않습니다. Firebase Authentication에서 Google을 사용 설정해 주세요.',
  'auth/internal-error': 'Google 로그인 설정이 완료되지 않았습니다. Google Cloud OAuth 클라이언트에 현재 사이트 주소와 http://localhost:3000 을 추가해 주세요.',
  'auth/account-exists-with-different-credential': '같은 이메일이 다른 로그인 방식으로 이미 가입되어 있습니다.',
};

const PASSWORD_CONFIRM_ERROR_CODES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
]);

export function getAuthErrorMessage(
  error: unknown,
  fallback = '요청에 실패했습니다.',
  context?: 'passwordConfirm',
): string {
  if (error instanceof FirebaseError) {
    if (context === 'passwordConfirm' && PASSWORD_CONFIRM_ERROR_CODES.has(error.code)) {
      return '비밀번호가 올바르지 않습니다.';
    }
    return AUTH_ERROR_MESSAGES[error.code] ?? `${fallback} (${error.code})`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const inputClassName =
  'w-full rounded-lg border border-border-strong bg-surface px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

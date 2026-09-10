const GOOGLE_AUTH_RETURN_KEY = 'job365.googleAuthReturn';
const GOOGLE_AUTH_ERROR_KEY = 'job365.googleAuthError';

function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|KAKAOTALK|NAVER\(inapp/i.test(ua);
}

export function shouldUseGoogleRedirect(): boolean {
  return isInAppBrowser();
}

export function shouldFallbackGoogleRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request')
  );
}

export function saveGoogleAuthReturn(returnPath: string): void {
  sessionStorage.setItem(GOOGLE_AUTH_RETURN_KEY, returnPath);
}

export function peekGoogleAuthReturn(): string | null {
  return sessionStorage.getItem(GOOGLE_AUTH_RETURN_KEY);
}

export function consumeGoogleAuthReturn(): string | null {
  const value = sessionStorage.getItem(GOOGLE_AUTH_RETURN_KEY);
  sessionStorage.removeItem(GOOGLE_AUTH_RETURN_KEY);
  return value;
}

export function saveGoogleAuthError(message: string): void {
  sessionStorage.setItem(GOOGLE_AUTH_ERROR_KEY, message);
}

export function consumeGoogleAuthError(): string | null {
  const value = sessionStorage.getItem(GOOGLE_AUTH_ERROR_KEY);
  sessionStorage.removeItem(GOOGLE_AUTH_ERROR_KEY);
  return value;
}

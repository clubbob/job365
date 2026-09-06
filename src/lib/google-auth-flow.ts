const GOOGLE_AUTH_RETURN_KEY = 'job365.googleAuthReturn';
const GOOGLE_AUTH_ERROR_KEY = 'job365.googleAuthError';

export function shouldUseGoogleRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
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

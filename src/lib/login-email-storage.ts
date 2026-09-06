const EMAIL_KEY = 'job365:login-email';
const REMEMBER_KEY = 'job365:login-email-remember';

export function loadRememberedLoginEmail(): { email: string; remember: boolean } {
  if (typeof window === 'undefined') {
    return { email: '', remember: true };
  }

  const remember = localStorage.getItem(REMEMBER_KEY) !== 'false';
  const email = remember ? (localStorage.getItem(EMAIL_KEY) ?? '') : '';

  return { email, remember };
}

export function saveRememberedLoginEmail(email: string, remember: boolean): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');

  if (remember) {
    localStorage.setItem(EMAIL_KEY, email.trim());
  } else {
    localStorage.removeItem(EMAIL_KEY);
  }
}

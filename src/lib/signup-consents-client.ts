import { getClientAuth } from '@/lib/firebase';

export async function saveSignupConsents(marketingAgreed: boolean): Promise<boolean> {
  const auth = getClientAuth();
  const user = auth?.currentUser;
  if (!user) return false;

  const token = await user.getIdToken();
  const res = await fetch('/api/auth/signup-consents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ marketingAgreed }),
  });

  return res.ok;
}

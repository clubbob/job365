import type { User } from 'firebase/auth';

export function isEmailPasswordUser(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === 'password');
}

export type UserProvider = 'email' | 'google' | 'kakao' | 'naver';
export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export type UserProfile = {
  id: string;
  email: string | null;
  nickname: string;
  provider: UserProvider;
  role: UserRole;
  status: UserStatus;
};

export type UserSettings = {
  userId: string;
  notifyEmailAgreed: boolean;
};

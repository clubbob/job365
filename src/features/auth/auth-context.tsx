'use client';

import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { getClientAuth } from '@/lib/firebase';
import { isEmailPasswordUser } from '@/lib/auth-providers';
import {
  saveGoogleAuthError,
  saveGoogleAuthReturn,
  shouldFallbackGoogleRedirect,
  shouldUseGoogleRedirect,
} from '@/lib/google-auth-flow';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  needsConsent: boolean;
  signInWithGoogle: (returnPath?: string) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshConsentStatus: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  reauthenticate: (password?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncUserToServer(
  user: User,
): Promise<{ needsConsent: boolean; suspended: boolean }> {
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 403) {
      const json = (await res.json()) as { error?: { code?: string } };
      if (json.error?.code === 'ACCOUNT_SUSPENDED') {
        return { needsConsent: false, suspended: true };
      }
    }

    if (!res.ok) {
      console.warn('[auth] sync failed', res.status);
      return { needsConsent: false, suspended: false };
    }

    const json = (await res.json()) as { ok?: boolean; data?: { needsConsent?: boolean } };
    return {
      needsConsent: json.ok ? (json.data?.needsConsent ?? false) : false,
      suspended: false,
    };
  } catch (error) {
    console.warn('[auth] sync failed', error);
    return { needsConsent: false, suspended: false };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [userRefreshKey, setUserRefreshKey] = useState(0);

  const refreshConsentStatus = useCallback(async () => {
    const auth = getClientAuth();
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      setNeedsConsent(false);
      return;
    }

    const pendingConsent = await syncUserToServer(currentUser);
    setNeedsConsent(pendingConsent.needsConsent);

    if (pendingConsent.suspended) {
      const auth = getClientAuth();
      if (auth) await signOut(auth);
    }
  }, []);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!mounted || !result?.user) return;

        const syncResult = await syncUserToServer(result.user);
        if (!mounted) return;

        if (syncResult.suspended) {
          await signOut(auth);
          setNeedsConsent(false);
          return;
        }

        setNeedsConsent(syncResult.needsConsent);
      } catch (error) {
        if (!mounted) return;
        saveGoogleAuthError(getAuthErrorMessage(error, 'Google 로그인에 실패했습니다.'));
      }
    })();

    return onAuthStateChanged(auth, async (nextUser) => {
      if (!mounted) return;
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        const syncResult = await syncUserToServer(nextUser);
        if (!mounted) return;

        if (syncResult.suspended) {
          await signOut(auth);
          setNeedsConsent(false);
          return;
        }
        setNeedsConsent(syncResult.needsConsent);
      } else {
        setNeedsConsent(false);
      }
    });
  }, []);

  const signInWithGoogle = useCallback(async (returnPath = '/') => {
    const auth = getClientAuth();
    if (!auth) throw new Error('Firebase가 설정되지 않았습니다.');

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    if (shouldUseGoogleRedirect()) {
      saveGoogleAuthReturn(returnPath);
      await signInWithRedirect(auth, provider);
      return false;
    }

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (shouldFallbackGoogleRedirect(error)) {
        saveGoogleAuthReturn(returnPath);
        await signInWithRedirect(auth, provider);
        return false;
      }
      throw error;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const pendingConsent = await syncUserToServer(currentUser);
    setNeedsConsent(pendingConsent.needsConsent);
    return pendingConsent.needsConsent;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getClientAuth();
    if (!auth) throw new Error('Firebase가 설정되지 않았습니다.');
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getClientAuth();
    if (!auth) throw new Error('Firebase가 설정되지 않았습니다.');
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const auth = getClientAuth();
    if (!auth) throw new Error('Firebase가 설정되지 않았습니다.');
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const refreshUserProfile = useCallback(async () => {
    const auth = getClientAuth();
    const currentUser = auth?.currentUser;
    if (!currentUser) return;

    await currentUser.reload();
    setUserRefreshKey((key) => key + 1);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const auth = getClientAuth();
    const currentUser = auth?.currentUser;
    if (!auth || !currentUser?.email) {
      throw new Error('Firebase가 설정되지 않았습니다.');
    }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }, []);

  const logout = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) return;
    await signOut(auth);
  }, []);

  const reauthenticate = useCallback(async (password?: string) => {
    const auth = getClientAuth();
    const currentUser = auth?.currentUser;
    if (!auth || !currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    if (isEmailPasswordUser(currentUser)) {
      if (!currentUser.email) {
        throw new Error('이메일 계정 정보를 확인할 수 없습니다.');
      }
      if (!password?.trim()) {
        throw new Error('비밀번호를 입력해 주세요.');
      }

      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'login' });
    await reauthenticateWithPopup(currentUser, provider);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      needsConsent,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      logout,
      refreshConsentStatus,
      refreshUserProfile,
      changePassword,
      reauthenticate,
    }),
    [
      user,
      loading,
      needsConsent,
      userRefreshKey,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      logout,
      refreshConsentStatus,
      refreshUserProfile,
      changePassword,
      reauthenticate,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

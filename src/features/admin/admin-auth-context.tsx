'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type AdminAuthContextValue = {
  isAdminPath: boolean;
  loading: boolean;
  loggedIn: boolean;
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/admin');
  const [loading, setLoading] = useState(isAdminPath);
  const [loggedIn, setLoggedIn] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAdminPath) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/session', { credentials: 'include' });
      const data = (await res.json()) as { ok?: boolean; data?: { authenticated?: boolean } };
      setLoggedIn(data.ok === true && data.data?.authenticated === true);
    } catch {
      setLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [isAdminPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: { message?: string };
    };
    if (!res.ok || !data.ok) {
      return { ok: false as const, message: data.error?.message || '로그인에 실패했습니다.' };
    }
    setLoggedIn(true);
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setLoggedIn(false);
  }, []);

  const value = useMemo(
    () => ({ isAdminPath, loading, loggedIn, login, logout }),
    [isAdminPath, loading, loggedIn, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}

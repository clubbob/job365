'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type AdminJobsNavContextValue = {
  pathname: string;
  shownPath: string;
  setPendingHref: (href: string) => void;
};

const AdminJobsNavContext = createContext<AdminJobsNavContextValue | null>(null);

export function AdminJobsNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (pathname === pendingHref || pathname.startsWith(`${pendingHref}/`)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const value = useMemo(
    () => ({
      pathname,
      shownPath: pendingHref ?? pathname,
      setPendingHref,
    }),
    [pathname, pendingHref],
  );

  return <AdminJobsNavContext.Provider value={value}>{children}</AdminJobsNavContext.Provider>;
}

export function useAdminJobsNav() {
  const value = useContext(AdminJobsNavContext);
  if (!value) {
    throw new Error('useAdminJobsNav는 AdminJobsNavProvider 안에서만 쓸 수 있습니다.');
  }
  return value;
}

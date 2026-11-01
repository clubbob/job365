'use client';

import type { ReactNode } from 'react';
import { AdminJobsNavProvider } from '@/features/admin/AdminJobsNavContext';
import AdminJobsSubNav from '@/features/admin/AdminJobsSubNav';
import AdminJobsTabPanels from '@/features/admin/AdminJobsTabPanels';

export default function AdminJobsShell({ children }: { children: ReactNode }) {
  return (
    <AdminJobsNavProvider>
      <div className="space-y-5">
        <div className="sticky top-14 z-40 -mx-4 border-b border-border bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <AdminJobsSubNav />
        </div>
        <AdminJobsTabPanels>{children}</AdminJobsTabPanels>
      </div>
    </AdminJobsNavProvider>
  );
}

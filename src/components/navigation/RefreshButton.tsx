'use client';

import { usePathname, useRouter } from 'next/navigation';
import { requestAdminJobsRefresh } from '@/lib/admin-jobs-refresh';
import { requestJobBoardRefresh } from '@/lib/job-board/refresh';

export default function RefreshButton() {
  const pathname = usePathname();
  const router = useRouter();

  function handleRefresh() {
    if (pathname === '/jobs' || pathname === '/my-jobs') {
      requestJobBoardRefresh();
      return;
    }
    if (pathname === '/notices' || pathname.startsWith('/notices/')) {
      router.refresh();
      return;
    }
    if (pathname.startsWith('/admin/jobs')) {
      requestAdminJobsRefresh();
      return;
    }
    const url = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(url);
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-neutral-50 hover:text-primary active:scale-[0.99] print:hidden"
    >
      새로 고침
    </button>
  );
}

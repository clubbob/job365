import { Suspense } from 'react';
import AdminCrawledJobsBySegmentPanel from '@/features/admin/AdminCrawledJobsBySegmentPanel';

export default function AdminCrawledJobsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <AdminCrawledJobsBySegmentPanel listMode="stored" />
    </Suspense>
  );
}

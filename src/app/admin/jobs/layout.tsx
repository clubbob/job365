import AdminJobsSubNav from '@/features/admin/AdminJobsSubNav';

export default function AdminJobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="sticky top-14 z-40 -mx-4 border-b border-border bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <AdminJobsSubNav />
      </div>
      {children}
    </div>
  );
}

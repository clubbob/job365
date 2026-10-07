import AdminJobsSubNav from '@/features/admin/AdminJobsSubNav';

export default function AdminJobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminJobsSubNav />
      {children}
    </div>
  );
}

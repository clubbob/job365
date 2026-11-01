import AdminJobsShell from '@/features/admin/AdminJobsShell';

export default function AdminJobsLayout({ children }: { children: React.ReactNode }) {
  return <AdminJobsShell>{children}</AdminJobsShell>;
}

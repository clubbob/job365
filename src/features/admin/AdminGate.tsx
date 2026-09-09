'use client';

import AdminLoginForm from '@/features/admin/AdminLoginForm';
import { useAdminAuth } from '@/features/admin/admin-auth-context';

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, loggedIn } = useAdminAuth();

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!loggedIn) {
    return <AdminLoginForm />;
  }

  return children;
}

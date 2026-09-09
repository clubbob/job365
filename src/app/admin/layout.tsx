import type { Metadata } from 'next';
import AdminGate from '@/features/admin/AdminGate';

export const metadata: Metadata = {
  title: '관리자 | JOB 365',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}

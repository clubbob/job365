'use client';

import ConsentGate from '@/components/auth/ConsentGate';
import { AdminAuthProvider } from '@/features/admin/admin-auth-context';
import { AuthProvider } from '@/features/auth/auth-context';
import { ModeProvider } from '@/features/mode/mode-context';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ModeProvider>
        <AdminAuthProvider>
          <ConsentGate>{children}</ConsentGate>
        </AdminAuthProvider>
      </ModeProvider>
    </AuthProvider>
  );
}

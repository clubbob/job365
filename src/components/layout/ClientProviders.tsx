'use client';

import ConsentGate from '@/components/auth/ConsentGate';
import { AuthProvider } from '@/features/auth/auth-context';
import { ModeProvider } from '@/features/mode/mode-context';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ModeProvider>
        <ConsentGate>{children}</ConsentGate>
      </ModeProvider>
    </AuthProvider>
  );
}

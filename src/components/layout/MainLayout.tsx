import { Suspense } from 'react';
import ClientProviders from './ClientProviders';
import HeaderClient from './HeaderClient';
import LayoutFooter from './LayoutFooter';
import LayoutMain from './LayoutMain';
import PageHomeBack from '@/components/navigation/PageHomeBack';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip">
        <Suspense fallback={<header className="sticky top-0 z-50 h-14 border-b border-border bg-surface" />}>
          <HeaderClient />
        </Suspense>
        <LayoutMain>
          <PageHomeBack />
          {children}
        </LayoutMain>
        <LayoutFooter />
      </div>
    </ClientProviders>
  );
}

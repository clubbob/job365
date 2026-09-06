import ClientProviders from './ClientProviders';
import HeaderClient from './HeaderClient';
import LayoutFooter from './LayoutFooter';
import LayoutMain from './LayoutMain';
import PageHomeBack from '@/components/navigation/PageHomeBack';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <div className="flex min-h-dvh flex-col">
        <HeaderClient />
        <LayoutMain>
          <PageHomeBack />
          {children}
        </LayoutMain>
        <LayoutFooter />
      </div>
    </ClientProviders>
  );
}

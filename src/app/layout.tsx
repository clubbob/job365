import type { Metadata, Viewport } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import { COMPANY } from '@/lib/company';
import { HOME_BANNER_TITLE } from '@/lib/site-menu-copy';
import { SITE_URL } from '@/lib/site';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: COMPANY.serviceName,
    template: `%s | ${COMPANY.serviceName}`,
  },
  description: HOME_BANNER_TITLE,
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}

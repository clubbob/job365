import type { Metadata, Viewport } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import { COMPANY } from '@/lib/company';
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
  description: '대기업·중견·채용 사이트에서 수집한 최신 채용 공고를 한곳에서 확인하세요.',
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

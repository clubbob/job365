import type { Metadata } from 'next';
import NoticesPageClient from '@/features/notices/NoticesPageClient';
import { listPublishedNotices } from '@/lib/notices-server';

export const metadata: Metadata = {
  title: '공지 사항',
};

export default async function NoticesPage() {
  let notices: Awaited<ReturnType<typeof listPublishedNotices>> = [];
  try {
    notices = await listPublishedNotices();
  } catch {
    notices = [];
  }

  return <NoticesPageClient notices={notices} />;
}

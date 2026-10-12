import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NoticeDetailClient from '@/features/notices/NoticeDetailClient';
import { getPublishedNotice } from '@/lib/notices-server';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const notice = await getPublishedNotice(id);
  if (!notice) return { title: '공지 사항' };
  return { title: notice.title };
}

export default async function NoticeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const notice = await getPublishedNotice(id);
  if (!notice) notFound();

  return <NoticeDetailClient notice={notice} />;
}

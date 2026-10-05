import type { Metadata } from 'next';
import MyJobsPageClient from '@/features/my-jobs/MyJobsPageClient';

export const metadata: Metadata = {
  title: '내 채용 공고',
  description: '수신 설정에 맞는 채용 공고를 확인하세요.',
};

export default function MyJobsPage() {
  return <MyJobsPageClient />;
}

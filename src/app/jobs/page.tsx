import type { Metadata } from 'next';
import JobsPageClient from '@/features/jobs/JobsPageClient';

export const metadata: Metadata = {
  title: '채용 정보',
  description: '정규직, 계약직, 인턴, 프리랜서, 알바, 파견직, 위촉직, 병역특례, 프로젝트 채용 정보를 한곳에서 확인하세요.',
};

export default function JobsPage() {
  return <JobsPageClient />;
}

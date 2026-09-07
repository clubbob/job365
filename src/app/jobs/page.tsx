import type { Metadata } from 'next';
import JobsPageClient from '@/features/jobs/JobsPageClient';

export const metadata: Metadata = {
  title: '채용 정보 | JOB 365',
  description: '정규직, 계약직, 인턴, 프리랜서, 파트타임, 파견·도급, 프로젝트 공고를 한곳에서 확인하세요.',
};

export default function JobsPage() {
  return <JobsPageClient />;
}

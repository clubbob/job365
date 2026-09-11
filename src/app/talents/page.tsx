import type { Metadata } from 'next';
import TalentsPageClient from '@/features/talents/TalentsPageClient';

export const metadata: Metadata = {
  title: '인재 정보',
  description: '정규직, 계약직, 인턴, 프리랜서, 파트타임, 파견·도급, 프로젝트 인재를 한곳에서 확인하세요.',
};

export default function TalentsPage() {
  return <TalentsPageClient />;
}

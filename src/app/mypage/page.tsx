import type { Metadata } from 'next';
import MyPageClient from '@/features/mypage/MyPageClient';

export const metadata: Metadata = {
  title: '마이페이지 | JOB 365',
};

export default function MyPage() {
  return <MyPageClient />;
}

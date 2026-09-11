import type { Metadata } from 'next';
import { Suspense } from 'react';
import MyPageClient from '@/features/mypage/MyPageClient';

export const metadata: Metadata = {
  title: '이용 현황',
};

export default function MyPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">불러오는 중…</p>}>
      <MyPageClient />
    </Suspense>
  );
}

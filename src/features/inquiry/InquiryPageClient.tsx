'use client';

import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import InquiryPanel from '@/features/mypage/InquiryPanel';
import { useAuth } from '@/features/auth/auth-context';
import { COMPANY } from '@/lib/company';

export default function InquiryPageClient() {
  const { user, loading } = useAuth();

  return (
    <div className="space-y-5">
      <PageHeader
        title="문의하기"
        description={`${COMPANY.name} 운영팀에 서비스 이용 문의를 남깁니다. 회원가입한 회원만 이용할 수 있습니다.`}
        showRefresh={false}
        homeHref="/mypage?tab=inquiry"
        homeLabel="마이페이지"
      />
      {loading ? (
        <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>
      ) : !user ? (
        <Card>
          <p className="text-sm text-muted">문의하기는 로그인 후에 이용할 수 있습니다.</p>
          <Link
            href="/login?next=/inquiry"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            로그인
          </Link>
        </Card>
      ) : (
        <InquiryPanel user={user} />
      )}
    </div>
  );
}

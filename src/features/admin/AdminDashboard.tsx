'use client';

import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';

export default function AdminDashboard() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="관리자"
        description="회원, 채용 정보, 이력서, 문의를 확인하고 수정·삭제합니다."
        homeHref="/"
        homeLabel="사이트로"
        homeOpenInNewWindow
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="회원" description="가입한 회원과 회사 정보 등록 여부를 확인하고 삭제합니다.">
          <Link
            href="/admin/users"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            회원 보기
          </Link>
        </Card>
        <Card title="채용 정보" description="공개·작성 중 상태를 확인하고 수정·삭제합니다.">
          <Link
            href="/admin/jobs"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            채용 정보 보기
          </Link>
        </Card>
        <Card title="이력서" description="공개·작성 중 상태를 확인하고 수정·삭제합니다.">
          <Link
            href="/admin/talents"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            이력서 보기
          </Link>
        </Card>
        <Card title="문의" description="회원이 보낸 문의를 확인하고 삭제합니다.">
          <Link
            href="/admin/inquiries"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            문의 보기
          </Link>
        </Card>
      </div>
    </div>
  );
}

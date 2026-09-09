'use client';

import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';

export default function AdminDashboard() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="관리자"
        description="회원과 서비스 운영 현황을 확인합니다."
        homeHref="/"
        homeLabel="사이트로"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="회원" description="가입한 회원을 확인하고 관리합니다.">
          <Link
            href="/admin/users"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            회원 보기
          </Link>
        </Card>
        <Card title="채용 정보" description="등록된 채용 정보를 조회하고 수정·삭제합니다.">
          <Link
            href="/admin/jobs"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            채용 정보 보기
          </Link>
        </Card>
        <Card title="이력서" description="등록된 이력서를 조회하고 수정·삭제합니다.">
          <Link
            href="/admin/talents"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            이력서 보기
          </Link>
        </Card>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';

export default function AdminDashboard() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="관리자"
        description="회원, 탈퇴 내역, 크롤링, 문의를 확인합니다."
        homeHref="/"
        homeLabel="사이트로"
        homeOpenInNewWindow
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="flex h-full flex-col"
          title="회원"
          description="가입한 회원 정보를 조회합니다. 삭제하면 회원 관련 모든 정보가 삭제됩니다."
        >
          <Link
            href="/admin/users"
            className="mt-auto inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            회원 보기
          </Link>
        </Card>
        <Card
          className="flex h-full flex-col"
          title="회원 탈퇴"
          description="회원이 남긴 탈퇴 사유를 확인합니다."
        >
          <Link
            href="/admin/withdrawals"
            className="mt-auto inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            탈퇴 내역 보기
          </Link>
        </Card>
        <Card
          className="flex h-full flex-col"
          title="채용 정보"
          description="수집 공고와 채용 공고 회사 노출을 관리합니다."
        >
          <Link
            href="/admin/jobs"
            className="mt-auto inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            채용 정보 보기
          </Link>
        </Card>
        <Card className="flex h-full flex-col" title="문의" description="회원 문의를 확인하고 답변합니다.">
          <Link
            href="/admin/inquiries"
            className="mt-auto inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            문의 보기
          </Link>
        </Card>
      </div>
    </div>
  );
}

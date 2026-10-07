'use client';

import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';

export default function AdminDashboard() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="관리자"
        description="회원, 탈퇴 내역, 크롤링, 이메일 발송, 문의를 확인합니다."
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
        <Card title="회원 탈퇴" description="회원이 남긴 탈퇴 사유를 확인합니다.">
          <Link
            href="/admin/withdrawals"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            탈퇴 내역 보기
          </Link>
        </Card>
        <Card title="채용 정보" description="수집 공고와 채용 공고 회사 노출을 관리합니다.">
          <Link
            href="/admin/jobs"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            채용 정보 보기
          </Link>
        </Card>
        <Card title="이메일 발송" description="채용 공고 알림 메일 발송 내역을 확인합니다.">
          <Link
            href="/admin/email-digests"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            발송 내역 보기
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

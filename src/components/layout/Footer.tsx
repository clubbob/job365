import Link from 'next/link';
import { COMPANY } from '@/lib/company';

const navLinkClassName =
  'text-muted transition-colors hover:text-foreground hover:underline hover:underline-offset-2';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface print:hidden">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-muted sm:px-8 sm:text-sm">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
          aria-label="법적 고지"
        >
          <Link href="/terms" className={navLinkClassName}>
            이용약관
          </Link>
          <Link href="/privacy" className={navLinkClassName}>
            개인정보처리방침
          </Link>
          <Link href="/marketing" className={navLinkClassName}>
            마케팅수신동의
          </Link>
          <Link href="/notices" className={navLinkClassName}>
            공지사항
          </Link>
          <Link href="/inquiry" className={navLinkClassName}>
            문의하기
          </Link>
        </nav>

        <div className="mt-3 space-y-1.5 break-words">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 md:gap-x-4">
            <span>상호 : {COMPANY.name}</span>
            <span className="text-subtle" aria-hidden>|</span>
            <span>대표 : {COMPANY.ceo}</span>
            <span className="text-subtle" aria-hidden>|</span>
            <span>사업자등록번호 : {COMPANY.businessNumber}</span>
          </p>

          <p className="flex flex-col flex-wrap items-center justify-center gap-1 md:flex-row md:gap-x-4">
            <span>주소 : {COMPANY.address}</span>
            <span className="hidden text-subtle md:inline" aria-hidden>|</span>
            <span>직업정보제공사업신고 : {COMPANY.jobInfoProviderReportNo}</span>
          </p>

          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 md:gap-x-4">
            <span>전화 : {COMPANY.phone}</span>
            <span className="text-subtle" aria-hidden>|</span>
            <span>이메일 : {COMPANY.email}</span>
          </p>
        </div>

        <p className="mt-2 text-subtle">
          Copyright © {year} {COMPANY.serviceName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

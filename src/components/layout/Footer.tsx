import Link from 'next/link';
import { COMPANY } from '@/lib/company';

const navLinkClassName =
  'text-muted transition-colors hover:text-foreground hover:underline hover:underline-offset-2';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface print:hidden">
      <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs leading-5 text-muted sm:px-6">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 sm:text-sm"
          aria-label="법적 고지"
        >
          <Link href="/terms" className={navLinkClassName}>
            이용약관
          </Link>
          <Link href="/privacy" className={navLinkClassName}>
            개인정보처리방침
          </Link>
          <Link href="/marketing" className={navLinkClassName}>
            마케팅 수신 동의
          </Link>
          <Link href="/inquiry" className={navLinkClassName}>
            문의하기
          </Link>
        </nav>

        <p className="mt-2">
          <Link
            href="/"
            className="font-semibold text-foreground transition-colors hover:text-primary"
          >
            {COMPANY.serviceName}
          </Link>
        </p>

        <p className="mt-0.5">
          <span className="whitespace-nowrap">회사명 : {COMPANY.name}</span>
          <span className="mx-1.5 text-subtle" aria-hidden>|</span>
          <span className="whitespace-nowrap">대표 : {COMPANY.ceo}</span>
          <span className="mx-1.5 text-subtle" aria-hidden>|</span>
          <span className="whitespace-nowrap">사업자등록번호 : {COMPANY.businessNumber}</span>
        </p>

        <p>
          <a
            href={`mailto:${COMPANY.email}`}
            className="transition-colors hover:text-foreground hover:underline hover:underline-offset-2"
          >
            이메일 : {COMPANY.email}
          </a>
        </p>

        <p className="mt-1 text-subtle">
          Copyright © {year} {COMPANY.serviceName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

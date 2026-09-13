import Link from 'next/link';
import { COMPANY } from '@/lib/company';

const navLinkClassName =
  'text-sm text-muted transition-colors hover:text-foreground hover:underline hover:underline-offset-2';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface print:hidden">
      <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center sm:px-6">
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
            마케팅 수신 동의
          </Link>
          <Link href="/inquiry" className={navLinkClassName}>
            문의하기
          </Link>
        </nav>

        <p className="mt-3 text-sm">
          <span className="font-semibold text-foreground">{COMPANY.serviceName}</span>
          <span className="mx-2 text-subtle" aria-hidden>
            ·
          </span>
          <span className="text-muted">무료 이용·매칭 서비스</span>
        </p>

        <p className="mt-2 text-xs leading-6 text-muted sm:text-sm">
          <span className="whitespace-nowrap">회사명 : {COMPANY.name}</span>
          <span className="mx-2 text-subtle" aria-hidden>
            |
          </span>
          <span className="whitespace-nowrap">대표 : {COMPANY.ceo}</span>
          <span className="mx-2 text-subtle" aria-hidden>
            |
          </span>
          <span className="whitespace-nowrap">사업자등록번호 : {COMPANY.businessNumber}</span>
        </p>
        <p className="mt-0.5 text-xs sm:text-sm">
          <a
            href={`mailto:${COMPANY.email}`}
            className="inline-block max-w-full text-muted transition-colors hover:text-foreground hover:underline hover:underline-offset-2"
          >
            이메일 : {COMPANY.email}
          </a>
        </p>

        <p className="mt-3 text-xs text-subtle">
          Copyright © 2026 {COMPANY.serviceName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

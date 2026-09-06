import Link from 'next/link';

const rowClassName = 'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6';

const linkClassName =
  'text-sm text-primary/80 underline decoration-primary/25 underline-offset-[3px] transition-colors hover:text-primary hover:decoration-primary/50';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface print:hidden">
      <div className="mx-auto max-w-4xl space-y-3 px-4 py-6 text-center text-sm text-muted sm:px-6">
        <nav className={rowClassName} aria-label="법적 고지">
          <Link href="/terms" className={linkClassName}>
            이용약관
          </Link>
          <Link href="/privacy" className={linkClassName}>
            개인정보처리방침
          </Link>
          <Link href="/marketing" className={linkClassName}>
            마케팅수신동의
          </Link>
          <Link href="/inquiry" className={linkClassName}>
            문의하기
          </Link>
        </nav>

        <div className={rowClassName}>
          <span className="text-sm text-muted">JOB 365</span>
          <span className="text-sm text-foreground">알바·재택·프리랜서 무료 매칭</span>
        </div>

        <p className="text-sm text-muted">Copyright © 2026 JOB 365. All rights reserved.</p>
      </div>
    </footer>
  );
}

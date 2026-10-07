'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin/jobs/crawled', label: '수집 채용 공고', description: '외부 채용 사이트에서 가져온 채용 공고' },
  { href: '/admin/jobs/sources', label: '채용 공고 회사', description: '기업집단·수집·노출 관리' },
  { href: '/admin/jobs/crawl-runs', label: '수집 실행 내역', description: '자동 수집 cron 결과' },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminJobsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="채용 정보 메뉴">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
              active
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:bg-neutral-100 hover:text-foreground',
            )}
            title={item.description}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

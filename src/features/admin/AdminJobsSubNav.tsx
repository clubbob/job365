'use client';

import { usePathname } from 'next/navigation';
import AdminInstantLink from '@/features/admin/AdminInstantLink';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin/jobs/sources', label: '수집 채용 회사', description: '수집 채용 회사별 활성 공고 건수' },
  { href: '/admin/jobs/crawled', label: '수집 채용 공고', description: '외부 채용 사이트에서 가져온 채용 공고' },
  { href: '/admin/jobs/crawl-runs', label: '수집 통계 요약', description: '수집 대상·마지막 수집·현재 공고' },
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
          <AdminInstantLink
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
          </AdminInstantLink>
        );
      })}
    </nav>
  );
}

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAdminJobsNav } from '@/features/admin/AdminJobsNavContext';
import AdminCrawlRunsClient from '@/features/admin/AdminCrawlRunsClient';
import AdminCrawlSourcesClient from '@/features/admin/AdminCrawlSourcesClient';
import AdminCrawledJobsBySegmentPanel from '@/features/admin/AdminCrawledJobsBySegmentPanel';
import AdminExtractListLogicClient from '@/features/admin/AdminExtractListLogicClient';

const LIST_HREFS = [
  '/admin/jobs/crawl-runs',
  '/admin/jobs/sources',
  '/admin/jobs/crawled',
  '/admin/jobs/browsable',
  '/admin/jobs/extract-list-logic',
] as const;

function listHrefFromPath(pathname: string): (typeof LIST_HREFS)[number] | null {
  const match = LIST_HREFS.find((href) => pathname === href);
  return match ?? null;
}

function isJobDetailPath(pathname: string): boolean {
  return /\/admin\/jobs\/(crawled|browsable)\/[^/]+$/.test(pathname);
}

function Panel({ href }: { href: (typeof LIST_HREFS)[number] }) {
  if (href === '/admin/jobs/crawl-runs') return <AdminCrawlRunsClient />;
  if (href === '/admin/jobs/sources') return <AdminCrawlSourcesClient />;
  if (href === '/admin/jobs/crawled') return <AdminCrawledJobsBySegmentPanel listMode="stored" />;
  if (href === '/admin/jobs/browsable') return <AdminCrawledJobsBySegmentPanel listMode="browsable" />;
  return <AdminExtractListLogicClient />;
}

/** 메뉴를 바꿔도 페이지를 다시 만들지 않아 바로 보입니다. */
export default function AdminJobsTabPanels({ children }: { children: ReactNode }) {
  const { shownPath } = useAdminJobsNav();
  const listHref = listHrefFromPath(shownPath);
  const [visited, setVisited] = useState<(typeof LIST_HREFS)[number][]>(() =>
    listHref ? [listHref] : [],
  );

  useEffect(() => {
    if (!listHref) return;
    setVisited((prev) => (prev.includes(listHref) ? prev : [...prev, listHref]));
    window.scrollTo(0, 0);
  }, [listHref]);

  const showRouteChildren = isJobDetailPath(shownPath) || !listHref;

  return (
    <div>
      {LIST_HREFS.filter((href) => visited.includes(href)).map((href) => {
        const active = href === listHref;
        return (
          <div
            key={href}
            hidden={!active}
            className={active ? undefined : 'hidden'}
            aria-hidden={!active}
            inert={!active || undefined}
          >
            <Panel href={href} />
          </div>
        );
      })}
      {showRouteChildren ? children : null}
    </div>
  );
}

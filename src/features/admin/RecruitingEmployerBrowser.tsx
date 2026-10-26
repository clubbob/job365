'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ADMIN_RECRUITING_COMPANIES_PAGE_SIZE } from '@/lib/admin-constants';
import { humanizeAdminFetchError } from '@/lib/admin-ui';
import { normalizeCompanyLabel } from '@/lib/crawler/company-name-match';
import {
  AdminCompanyRegistrySearchAndFilters,
  AdminCompanyRegistryTableHead,
  AdminListPagination,
  AdminListResultMeta,
  COMPANY_REGISTRY_EMPTY_LIST_MESSAGE,
  COMPANY_REGISTRY_LIST_CARD_DESCRIPTION,
  RegistryCareersUrlLink,
  adminListRowNumberCellClassName,
  adminRegistryRowNumber,
  adminRegistryTableClassName,
  adminRegistryTableWrapClassName,
  formatCompanyRegistryResultMeta,
  formatRegistryActiveJobCount,
} from '@/features/admin/AdminRegistryListChrome';

type Segment = 'enterprise' | 'mid-sized' | 'it' | 'semi-equipment';

type RegistryRow = {
  companyName: string;
  businessNumber: string;
  segmentLabel: string;
  active: boolean | null;
  careersUrl: string | null;
  linked: boolean;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
  careersUrlCheckedAt: string | null;
  activeJobCount: number;
  careersUrlNote?: string | null;
};

type RegistryResponse = {
  items: RegistryRow[];
  total: number;
  linkedCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  uniqueCompanyCount: number;
  withActiveJobsCount: number;
  registryCount: number;
};

const PAGE_SIZE = ADMIN_RECRUITING_COMPANIES_PAGE_SIZE;

const SEGMENT_LIST_DESCRIPTION: Record<Segment, string> = {
  enterprise: `${COMPANY_REGISTRY_LIST_CARD_DESCRIPTION} 공정거래위원회 공시 집단 명단을 공시 순위로 보여 줍니다.`,
  'mid-sized': `${COMPANY_REGISTRY_LIST_CARD_DESCRIPTION} 중견기업 명단을 유명도 순으로 보여 줍니다.`,
  it: `${COMPANY_REGISTRY_LIST_CARD_DESCRIPTION} IT 회사 명단을 유명도·모집 공고 순으로 보여 줍니다.`,
  'semi-equipment': `${COMPANY_REGISTRY_LIST_CARD_DESCRIPTION} 반도체·디스플레이 장비사 명단을 유명도·모집 공고 순으로 보여 줍니다.`,
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export default function RecruitingEmployerBrowser({
  segment,
  onListMeta,
}: {
  segment: Segment;
  onListMeta?: (meta: { segment: Segment; registryCount: number; withActiveJobsCount: number }) => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<RegistryRow[]>([]);
  const [listMeta, setListMeta] = useState<{
    registryCount: number;
    withActiveJobsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onListMetaRef = useRef(onListMeta);
  const fetchRequestIdRef = useRef(0);

  useEffect(() => {
    onListMetaRef.current = onListMeta;
  }, [onListMeta]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, segment]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++fetchRequestIdRef.current;
    setLoading(true);
    setError(null);
    setAllItems([]);
    setListMeta(null);

    void (async () => {
      try {
        const params = new URLSearchParams({
          segment,
          offset: '0',
          limit: '20000',
        });

        const res = await fetch(`/api/admin/recruiting-companies?${params}`, {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include',
        });
        const json = (await res.json()) as { ok?: boolean; data?: RegistryResponse };
        if (controller.signal.aborted) return;

        if (!res.ok || !json.ok || !json.data) {
          throw new Error('수집 채용 회사 목록을 불러오지 못했습니다.');
        }

        setAllItems(json.data.items);
        setListMeta({
          registryCount: json.data.registryCount,
          withActiveJobsCount: json.data.withActiveJobsCount,
        });
        onListMetaRef.current?.({
          segment,
          registryCount: json.data.registryCount,
          withActiveJobsCount: json.data.withActiveJobsCount,
        });
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) return;
        setError(
          humanizeAdminFetchError(
            err instanceof Error ? err.message : '수집 채용 회사 목록을 불러오지 못했습니다.',
          ),
        );
        setAllItems([]);
        setListMeta(null);
      } finally {
        if (fetchRequestIdRef.current === requestId) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [segment]);

  const filteredItems = useMemo(() => {
    const needle = normalizeCompanyLabel(debouncedQuery);
    if (!needle) return allItems;
    return allItems.filter((row) => normalizeCompanyLabel(row.companyName).includes(needle));
  }, [allItems, debouncedQuery]);

  const resultTotal = filteredItems.length;
  const pageItems = filteredItems.slice(offset, offset + PAGE_SIZE);
  const initialLoading = loading && allItems.length === 0;

  return (
    <Card
      title="수집 채용 회사 목록"
      description={SEGMENT_LIST_DESCRIPTION[segment]}
    >
      <AdminCompanyRegistrySearchAndFilters
        searchId={`recruiting-employer-search-${segment}`}
        query={query}
        onQueryChange={setQuery}
      />

      <AdminListResultMeta>
        {formatCompanyRegistryResultMeta(listMeta ? resultTotal : 0, debouncedQuery)}
      </AdminListResultMeta>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {initialLoading ? (
        <p className="text-sm text-muted">불러오는 중…</p>
      ) : null}

      {pageItems.length > 0 ? (
        <>
          <div className={adminRegistryTableWrapClassName}>
            <table className={adminRegistryTableClassName}>
              <AdminCompanyRegistryTableHead />
              <tbody className="divide-y divide-border">
                {pageItems.map((row, index) => (
                  <tr key={`${row.companyName}-${row.businessNumber}`} className="text-foreground">
                    <td className={adminListRowNumberCellClassName}>
                      {adminRegistryRowNumber(offset, index).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-3 py-2 font-medium">{row.companyName}</td>
                    <td className="px-3 py-2 text-muted">{row.businessNumber}</td>
                    <td className="px-3 py-2 text-muted">
                      {formatRegistryActiveJobCount(row.activeJobCount)}
                    </td>
                    <td className="px-3 py-2">
                      <RegistryCareersUrlLink url={row.careersUrl} note={row.careersUrlNote} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminListPagination
            page={Math.floor(offset / PAGE_SIZE) + 1}
            totalPages={Math.max(1, Math.ceil(resultTotal / PAGE_SIZE))}
            total={resultTotal}
            pageSize={PAGE_SIZE}
            ariaLabel="수집 채용 회사 페이지"
            onPageChange={(nextPage) => setOffset((nextPage - 1) * PAGE_SIZE)}
          />
        </>
      ) : null}

      {!loading && allItems.length > 0 && pageItems.length === 0 ? (
        <p className="text-sm text-muted">{COMPANY_REGISTRY_EMPTY_LIST_MESSAGE}</p>
      ) : null}
      {!loading && allItems.length === 0 ? (
        <p className="text-sm text-muted">{COMPANY_REGISTRY_EMPTY_LIST_MESSAGE}</p>
      ) : null}
    </Card>
  );
}

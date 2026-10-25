'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ADMIN_RECRUITING_COMPANIES_PAGE_SIZE } from '@/lib/admin-constants';
import {
  AdminCompanyRegistrySearchAndFilters,
  AdminCompanyRegistryStatGrid,
  AdminCompanyRegistryTableHead,
  AdminListPagination,
  AdminListResultMeta,
  COMPANY_REGISTRY_EMPTY_LIST_MESSAGE,
  COMPANY_REGISTRY_LIST_CARD_DESCRIPTION,
  COMPANY_REGISTRY_STAT_EMPTY,
  RegistryCareersUrlLink,
  adminListRowNumberCellClassName,
  adminRegistryRowNumber,
  adminRegistryTableClassName,
  formatRegistryActiveJobCount,
  adminRegistryTableWrapClassName,
  formatCompanyRegistryResultMeta,
} from '@/features/admin/AdminRegistryListChrome';

type CareersDiscoveryStatus = 'pending' | 'found' | 'not_found';

type RegistryRow = {
  companyName: string;
  businessNumber: string;
  validTo: string | null;
  active: boolean;
  careersUrl: string | null;
  linked: boolean;
  careersDiscoveryStatus: CareersDiscoveryStatus;
  careersUrlCheckedAt: string | null;
  activeJobCount: number;
};

type RegistryResponse = {
  items: RegistryRow[];
  total: number;
  linkedCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  uniqueCompanyCount: number;
  rawRowCount: number;
  activeCertificateCount: number;
  probedCount: number;
  notFoundCount: number;
  pendingCount: number;
  targetsOnDisk: number;
};

const PAGE_SIZE = ADMIN_RECRUITING_COMPANIES_PAGE_SIZE;

export default function MidSizedRegistryBrowser() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
      const res = await fetch(`/api/admin/mid-sized-companies?${params}`);
      const json = (await res.json()) as { ok?: boolean; data?: RegistryResponse };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error('명단을 불러오지 못했습니다.');
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '명단을 불러오지 못했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const resultTotal = data?.total ?? 0;
  const initialLoading = loading && data === null;
  const refreshing = loading && data !== null;

  return (
    <Card
      title="목록 검색"
      description={`${COMPANY_REGISTRY_LIST_CARD_DESCRIPTION} 목록은 유명도 순입니다.`}
    >
      <AdminCompanyRegistryStatGrid
        uniqueCompanies={
          data ? `${data.uniqueCompanyCount.toLocaleString('ko-KR')}곳` : COMPANY_REGISTRY_STAT_EMPTY
        }
        linkedUrl={data ? `${data.linkedCount.toLocaleString('ko-KR')}곳` : COMPANY_REGISTRY_STAT_EMPTY}
      />

      <AdminCompanyRegistrySearchAndFilters
        searchId="mid-sized-registry-search"
        query={query}
        onQueryChange={setQuery}
      />

      <AdminListResultMeta>
        {data
          ? formatCompanyRegistryResultMeta(resultTotal, debouncedQuery)
          : formatCompanyRegistryResultMeta(0, debouncedQuery)}
        {refreshing ? ' · 갱신 중' : ''}
      </AdminListResultMeta>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {initialLoading ? <p className="text-sm text-muted">불러오는 중…</p> : null}

      {data && data.items.length > 0 ? (
        <>
          <div className={adminRegistryTableWrapClassName}>
            <table className={adminRegistryTableClassName}>
              <AdminCompanyRegistryTableHead />
              <tbody className="divide-y divide-border">
                {data.items.map((row, index) => (
                  <tr key={row.businessNumber} className="text-foreground">
                    <td className={adminListRowNumberCellClassName}>
                      {adminRegistryRowNumber(data.offset, index).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-3 py-2 font-medium">{row.companyName}</td>
                    <td className="px-3 py-2 text-muted">{row.businessNumber}</td>
                    <td className="px-3 py-2 text-muted">
                      {formatRegistryActiveJobCount(row.activeJobCount)}
                    </td>
                    <td className="px-3 py-2">
                      <RegistryCareersUrlLink url={row.careersUrl} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminListPagination
            page={Math.floor(data.offset / data.limit) + 1}
            totalPages={Math.max(1, Math.ceil(data.total / data.limit))}
            total={data.total}
            pageSize={data.limit}
            loading={refreshing}
            ariaLabel="수집 채용 회사 페이지"
            onPageChange={(nextPage) => setOffset((nextPage - 1) * PAGE_SIZE)}
          />
        </>
      ) : null}

      {!loading && data && data.items.length === 0 ? (
        <p className="text-sm text-muted">{COMPANY_REGISTRY_EMPTY_LIST_MESSAGE}</p>
      ) : null}
    </Card>
  );
}

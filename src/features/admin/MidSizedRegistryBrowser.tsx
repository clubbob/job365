'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
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
  RegistryDetailButton,
  RegistryTableEmptyCell,
  adminRegistryTableClassName,
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

const PAGE_SIZE = 50;

function discoveryLabel(status: CareersDiscoveryStatus): string {
  if (status === 'found') return 'URL 연결';
  if (status === 'not_found') return '탐색 완료(미연결)';
  return '미탐색';
}

export default function MidSizedRegistryBrowser() {
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [notFoundOnly, setNotFoundOnly] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });
      if (query.trim()) params.set('q', query.trim());
      if (activeOnly) params.set('activeOnly', '1');
      if (linkedOnly) params.set('linkedOnly', '1');
      if (notFoundOnly) params.set('notFoundOnly', '1');
      if (pendingOnly) params.set('pendingOnly', '1');
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
  }, [activeOnly, linkedOnly, notFoundOnly, offset, pendingOnly, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [query, activeOnly, linkedOnly, notFoundOnly, pendingOnly]);

  const resultTotal = data?.total ?? 0;

  return (
    <Card title="목록 검색" description={COMPANY_REGISTRY_LIST_CARD_DESCRIPTION}>
      <AdminCompanyRegistryStatGrid
        uniqueCompanies={
          data ? `${data.uniqueCompanyCount.toLocaleString('ko-KR')}곳` : COMPANY_REGISTRY_STAT_EMPTY
        }
        linkedUrl={data ? `${data.linkedCount.toLocaleString('ko-KR')}곳` : COMPANY_REGISTRY_STAT_EMPTY}
        validCert={
          data ? `${data.activeCertificateCount.toLocaleString('ko-KR')}곳` : COMPANY_REGISTRY_STAT_EMPTY
        }
      />

      <AdminCompanyRegistrySearchAndFilters
        searchId="mid-sized-registry-search"
        query={query}
        onQueryChange={setQuery}
        filters={{
          activeOnly,
          linkedOnly,
          notFoundOnly,
          pendingOnly,
          onActiveOnly: setActiveOnly,
          onLinkedOnly: setLinkedOnly,
          onNotFoundOnly: setNotFoundOnly,
          onPendingOnly: setPendingOnly,
        }}
      />

      <AdminListResultMeta>
        {data ? formatCompanyRegistryResultMeta(resultTotal, query) : formatCompanyRegistryResultMeta(0, query)}
      </AdminListResultMeta>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}

      {!loading && data && data.items.length > 0 ? (
        <>
          <div className={adminRegistryTableWrapClassName}>
            <table className={adminRegistryTableClassName}>
              <AdminCompanyRegistryTableHead />
              <tbody className="divide-y divide-border">
                {data.items.map((row) => (
                  <tr key={row.businessNumber} className="text-foreground">
                    <td className="px-3 py-2 font-medium">{row.companyName}</td>
                    <td className="px-3 py-2 text-muted">{row.businessNumber}</td>
                    <td className="px-3 py-2 text-muted">{row.active ? '유효' : '만료'}</td>
                    <td className="px-3 py-2 text-muted">{discoveryLabel(row.careersDiscoveryStatus)}</td>
                    <td className="px-3 py-2 text-muted">
                      <RegistryTableEmptyCell />
                    </td>
                    <td className="px-3 py-2">
                      <RegistryCareersUrlLink url={row.careersUrl} />
                    </td>
                    <td className="px-3 py-2">
                      <RegistryDetailButton disabled />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminListPagination
            rangeStart={data.offset + 1}
            rangeEnd={Math.min(data.offset + data.limit, data.total)}
            total={data.total}
            prevDisabled={data.offset === 0}
            nextDisabled={!data.hasMore}
            onPrev={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
            onNext={() => setOffset((value) => value + PAGE_SIZE)}
          />
        </>
      ) : null}

      {!loading && data && data.items.length === 0 ? (
        <p className="text-sm text-muted">{COMPANY_REGISTRY_EMPTY_LIST_MESSAGE}</p>
      ) : null}
    </Card>
  );
}

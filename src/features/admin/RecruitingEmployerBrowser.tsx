'use client';

import { useEffect, useRef, useState } from 'react';
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
  adminRegistryTableClassName,
  adminRegistryTableWrapClassName,
  formatCompanyRegistryResultMeta,
  formatRegistryActiveJobCount,
} from '@/features/admin/AdminRegistryListChrome';

type Segment = 'enterprise' | 'mid-sized' | 'misc' | 'it';

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

const PAGE_SIZE = 50;

const SEGMENT_REGISTRY_LABEL: Record<Segment, string> = {
  enterprise: '대기업·계열',
  'mid-sized': '중견 명단',
  misc: '기타기업 명단',
  it: 'IT 명단',
};

const SEGMENT_COPY: Record<Segment, { statHint: string; sortHint: string }> = {
  enterprise: {
    statHint: '공시 집단 고정 명단(채용 URL·수집 출처별 공고 건수)',
    sortHint: '공시 순위',
  },
  'mid-sized': {
    statHint: '중견 명단(수집 채용 회사명 매칭)',
    sortHint: '유명도 순',
  },
  misc: {
    statHint: '대·중 명단에 없는 별도 수집 소스(매일 전체 수집)',
    sortHint: '공고 건수 순',
  },
  it: {
    statHint: '대·중·기타 명단에서 IT만 모아 보기(수집 주기는 소속 구분 따름)',
    sortHint: '유명도·공고 건수 순',
  },
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
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onListMetaRef = useRef(onListMeta);

  useEffect(() => {
    onListMetaRef.current = onListMeta;
  }, [onListMeta]);

  const copy = SEGMENT_COPY[segment];

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, segment]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const params = new URLSearchParams({
          segment,
          offset: String(offset),
          limit: String(PAGE_SIZE),
        });
        if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());

        const res = await fetch(`/api/admin/recruiting-companies?${params}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const json = (await res.json()) as { ok?: boolean; data?: RegistryResponse };
        if (controller.signal.aborted) return;

        if (!res.ok || !json.ok || !json.data) {
          throw new Error('수집 채용 회사 목록을 불러오지 못했습니다.');
        }

        setData(json.data);
        onListMetaRef.current?.({
          segment,
          registryCount: json.data.registryCount,
          withActiveJobsCount: json.data.withActiveJobsCount,
        });
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '수집 채용 회사 목록을 불러오지 못했습니다.');
        setData(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery, offset, segment]);

  const resultTotal = data?.total ?? 0;
  const initialLoading = loading && data === null;
  const refreshing = loading && data !== null;

  return (
    <Card
      title="수집 채용 회사 목록"
      description={`${COMPANY_REGISTRY_LIST_CARD_DESCRIPTION} ${copy.statHint}. 목록은 ${copy.sortHint}입니다.`}
    >
      <AdminCompanyRegistryStatGrid
        uniqueCompaniesLabel={SEGMENT_REGISTRY_LABEL[segment]}
        uniqueCompanies={
          data && typeof data.registryCount === 'number'
            ? `${data.registryCount.toLocaleString('ko-KR')}곳`
            : COMPANY_REGISTRY_STAT_EMPTY
        }
        linkedUrl={
          data && typeof data.linkedCount === 'number'
            ? `${data.linkedCount.toLocaleString('ko-KR')}곳`
            : COMPANY_REGISTRY_STAT_EMPTY
        }
      />

      <AdminCompanyRegistrySearchAndFilters
        searchId={`recruiting-employer-search-${segment}`}
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
      {initialLoading ? (
        <p className="text-sm text-muted">불러오는 중…</p>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className={adminRegistryTableWrapClassName}>
            <table className={adminRegistryTableClassName}>
              <AdminCompanyRegistryTableHead />
              <tbody className="divide-y divide-border">
                {data.items.map((row) => (
                  <tr key={`${row.companyName}-${row.businessNumber}`} className="text-foreground">
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

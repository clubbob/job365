'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

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

  return (
    <Card title="중견기업 명단 (고유 회사)">
      <p className="mb-3 text-sm text-muted">
        중견기업정보마당 원본은 발급 이력이 여러 행입니다. 사업자번호 기준으로 한 회사씩 묶어 파악합니다.
      </p>

      {data ? (
        <div className="mb-4 grid gap-2 rounded-lg border border-border bg-neutral-50 px-3 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="text-muted">고유 기업 </span>
            <span className="font-semibold text-foreground">{data.uniqueCompanyCount.toLocaleString('ko-KR')}곳</span>
          </p>
          <p>
            <span className="text-muted">유효 인증 </span>
            <span className="font-semibold text-foreground">
              {data.activeCertificateCount.toLocaleString('ko-KR')}곳
            </span>
          </p>
          <p>
            <span className="text-muted">채용 URL </span>
            <span className="font-semibold text-foreground">{data.linkedCount.toLocaleString('ko-KR')}곳</span>
          </p>
          <p>
            <span className="text-muted">탐색 </span>
            <span className="font-semibold text-foreground">
              완료 {data.probedCount.toLocaleString('ko-KR')} · 미탐색 {data.pendingCount.toLocaleString('ko-KR')}
            </span>
          </p>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="회사명·사업자번호 검색"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground sm:min-w-[14rem]"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(event) => setActiveOnly(event.target.checked)}
            className="rounded border-border"
          />
          유효 인증만
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={linkedOnly}
            onChange={(event) => setLinkedOnly(event.target.checked)}
            className="rounded border-border"
          />
          URL 연결만
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={notFoundOnly}
            onChange={(event) => setNotFoundOnly(event.target.checked)}
            className="rounded border-border"
          />
          탐색 완료(미연결)
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(event) => setPendingOnly(event.target.checked)}
            className="rounded border-border"
          />
          미탐색만
        </label>
      </div>

      {data ? (
        <p className="mb-3 text-xs text-subtle">
          마당 원본 {data.rawRowCount.toLocaleString('ko-KR')}행 · 조회 결과 {data.total.toLocaleString('ko-KR')}건
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}

      {!loading && data && data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-border bg-neutral-50 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">기업명</th>
                  <th className="px-3 py-2 font-semibold">사업자번호</th>
                  <th className="px-3 py-2 font-semibold">인증</th>
                  <th className="px-3 py-2 font-semibold">탐색</th>
                  <th className="px-3 py-2 font-semibold">채용 URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((row) => (
                  <tr key={row.businessNumber} className="text-foreground">
                    <td className="px-3 py-2 font-medium">{row.companyName}</td>
                    <td className="px-3 py-2 text-muted">{row.businessNumber}</td>
                    <td className="px-3 py-2 text-muted">{row.active ? '유효' : '만료'}</td>
                    <td className="px-3 py-2 text-muted">{discoveryLabel(row.careersDiscoveryStatus)}</td>
                    <td className="px-3 py-2">
                      {row.careersUrl ? (
                        <a
                          href={row.careersUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline decoration-primary/30 underline-offset-[3px]"
                        >
                          열기
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>
              {data.offset + 1}–{Math.min(data.offset + data.limit, data.total)} / {data.total.toLocaleString('ko-KR')}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={data.offset === 0}
                onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                이전
              </button>
              <button
                type="button"
                disabled={!data.hasMore}
                onClick={() => setOffset((value) => value + PAGE_SIZE)}
                className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        </>
      ) : null}

      {!loading && data && data.items.length === 0 ? (
        <p className="text-sm text-muted">조건에 맞는 기업이 없습니다.</p>
      ) : null}
    </Card>
  );
}

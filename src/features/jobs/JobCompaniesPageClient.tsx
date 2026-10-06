'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import {
  buildEnterpriseGroupRows,
  summarizeEnterpriseGroupRows,
  type EnterpriseGroupRow,
} from '@/lib/crawler/enterprise-group-rows';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';
import { COMPANIES_PAGE_DESCRIPTION } from '@/lib/site-menu-copy';
import { cn } from '@/lib/utils';

type CompaniesSummary = ReturnType<typeof summarizeEnterpriseGroupRows>;

type CompaniesPageData = {
  summary: CompaniesSummary;
  rows: EnterpriseGroupRow[];
};

function statusLabel(status: EnterpriseGroupRow['crawlStatus'], activeJobCount: number) {
  if (status === 'collected') return `채용 공고 ${activeJobCount}개`;
  if (status === 'empty') return '공고 없음';
  if (status === 'pending') return '연결 예정';
  return '채용 사이트 미연결';
}

function CompaniesLoading() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="채용 공고 회사"
        description={COMPANIES_PAGE_DESCRIPTION}
        homeHref="/jobs"
        homeLabel="채용 공고"
      />
      <Card>
        <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>
      </Card>
    </div>
  );
}

function CompaniesContent({ summary, rows }: CompaniesPageData) {
  const [query, setQuery] = useState('');
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const haystack = [
        row.name,
        row.owner,
        row.sourceName ?? '',
        ...row.discoveredAffiliates.map((item) => item.companyName),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, query]);

  function toggleExpanded(rank: number) {
    setExpandedRank((current) => (current === rank ? null : rank));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="채용 공고 회사"
        description={COMPANIES_PAGE_DESCRIPTION}
        homeHref="/jobs"
        homeLabel="채용 공고"
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">수집 일정</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{CRAWL_SCHEDULE.label}</p>
            <p className="text-xs text-subtle">cron UTC {CRAWL_SCHEDULE.cronUtc}</p>
          </div>
          <div>
            <p className="text-xs text-muted">등록된 채용 공고</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{summary.totalActiveJobs}건</p>
            <p className="text-xs text-subtle">
              수집됨 {summary.collectedCount}개 집단 · 공고 없음 {summary.emptyCount}개
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">확인된 계열사</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{summary.discoveredAffiliateCount}곳</p>
            <p className="text-xs text-subtle">채용 공고에 나온 모집 회사명</p>
          </div>
          <div>
            <p className="text-xs text-muted">기업집단 연결</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{summary.linkedCount}개</p>
            <p className="text-xs text-subtle">
              연결 예정 {summary.pendingCount} · 미연결 {summary.unlinkedCount}
            </p>
          </div>
        </div>
      </Card>

      <Card title="대기업·계열사">
        <div className="mb-4">
          <label className="sr-only" htmlFor="enterprise-group-search">기업집단·계열사 검색</label>
          <input
            id="enterprise-group-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="기업집단·대표님·계열사 검색"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {filteredRows.map((row) => {
            const expanded = expandedRank === row.rank;
            const affiliateCount = row.discoveredAffiliates.length;

            return (
              <li key={row.rank}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(row.rank)}
                  className="flex w-full items-center gap-2 px-3 py-3 text-left transition hover:bg-neutral-50 sm:gap-3 sm:px-4"
                  aria-expanded={expanded}
                >
                  <span
                    className={cn(
                      'shrink-0 text-muted transition-transform',
                      expanded ? 'rotate-90' : 'rotate-0',
                    )}
                    aria-hidden
                  >
                    ▶
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="text-xs text-muted">{row.rank}</span>
                    <span className="font-semibold text-foreground">{row.name}</span>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                        row.crawlStatus === 'collected'
                          ? 'bg-primary/10 text-primary'
                          : row.crawlStatus === 'empty'
                            ? 'bg-neutral-100 text-muted'
                            : row.crawlStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-muted',
                      )}
                    >
                      {statusLabel(row.crawlStatus, row.activeJobCount)}
                    </span>
                    <span className="text-xs text-muted">
                      대표님 {row.owner}
                      {affiliateCount > 0 ? ` · 검색 계열사 ${affiliateCount}곳` : ''}
                    </span>
                  </span>
                  {row.careersUrl ? (
                    <a
                      href={row.careersUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="shrink-0 text-[11px] text-muted hover:text-primary hover:underline sm:text-xs"
                    >
                      채용 사이트
                    </a>
                  ) : null}
                </button>

                {expanded ? (
                  <div className="border-t border-border bg-neutral-50/80 px-3 py-3 sm:px-4 sm:pl-11">
                    {affiliateCount > 0 ? (
                      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {row.discoveredAffiliates.map((affiliate) => (
                          <li
                            key={affiliate.companyName}
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                          >
                            <p className="font-medium text-foreground">{affiliate.companyName}</p>
                            <p className="mt-0.5 text-xs text-muted">채용 공고 {affiliate.activeJobCount}건</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">
                        {row.crawlStatus === 'unlinked'
                          ? '채용 사이트를 연결하면 매일 자동 조회합니다. 공고가 올라오면 계열사 이름이 여기에 표시됩니다.'
                          : row.crawlStatus === 'pending'
                            ? '채용 사이트는 연결됐지만 수집기가 아직 준비 중입니다.'
                            : row.crawlStatus === 'empty'
                              ? '채용 사이트는 연결됐지만 현재 등록할 수 있는 공고가 없습니다. URL 오류나 사이트 구조 변경일 수 있습니다.'
                              : '수집된 모집 회사명이 없습니다.'}
                      </p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {filteredRows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">검색 결과가 없습니다.</p>
        ) : null}
      </Card>
    </div>
  );
}

export default function JobCompaniesPageClient() {
  const [data, setData] = useState<CompaniesPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch('/api/jobs/companies', {
          signal: controller.signal,
          cache: 'no-store',
        });
        const json = (await response.json()) as {
          ok?: boolean;
          data?: CompaniesPageData;
        };

        if (!response.ok || !json.ok || !json.data) {
          throw new Error('load_failed');
        }

        setData(json.data);
        setError(null);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('[jobs/companies] client load failed', loadError);
        setError('목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        setData({
          summary: summarizeEnterpriseGroupRows(buildEnterpriseGroupRows({}, {})),
          rows: buildEnterpriseGroupRows({}, {}),
        });
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  if (!data) {
    return <CompaniesLoading />;
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}
      <CompaniesContent summary={data.summary} rows={data.rows} />
    </div>
  );
}

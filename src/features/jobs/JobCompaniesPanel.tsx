'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import {
  AdminListPagination,
  AdminListResultMeta,
  AdminCompanyRegistryTableHead,
  AdminCompanyRegistrySearchAndFilters,
  AdminCompanyRegistryStatGrid,
  COMPANY_REGISTRY_EMPTY_LIST_MESSAGE,
  COMPANY_REGISTRY_LIST_CARD_DESCRIPTION,
  COMPANY_REGISTRY_STAT_EMPTY,
  COMPANY_REGISTRY_TABLE_COLUMN_COUNT,
  RegistryCareersUrlLink,
  RegistryDetailButton,
  RegistryTableEmptyCell,
  adminRegistryTableClassName,
  adminRegistryTableWrapClassName,
  formatCompanyRegistryResultMeta,
} from '@/features/admin/AdminRegistryListChrome';
import MidSizedRegistryBrowser from '@/features/admin/MidSizedRegistryBrowser';
import { adminPrimaryActionClassName } from '@/lib/admin-ui';
import type { EnterpriseGroupCrawlStatus } from '@/lib/crawler/enterprise-group-rows';
import type {
  JobCompaniesPayload,
  JobCompaniesSummary,
  JobCompanyGroupView,
  JobCompanySourceView,
} from '@/lib/job-companies-server';
import { cn } from '@/lib/utils';

type AdminSourcePatch = Partial<
  Pick<JobCompanySourceView['policy'], 'crawlDisabled' | 'displayDisabled' | 'reason'>
>;

type AdminCompanyPatch = Partial<
  Pick<JobCompanySourceView['policy'], 'crawlDisabled' | 'displayDisabled' | 'reason'>
>;

type CompanyPolicyView = {
  crawlDisabled: boolean;
  displayDisabled: boolean;
  reason: string | null;
};

function normalizeCompanyLabel(name: string): string {
  return name
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .trim()
    .toLowerCase();
}

/** 사이트 대표 회사와 같은 이름만 있으면 계열사 목록을 따로 보여 줄 필요 없음 */
function affiliatesBesidesOwner(
  companyName: string,
  affiliates: JobCompanySourceView['discoveredAffiliates'],
): JobCompanySourceView['discoveredAffiliates'] {
  const ownerKey = normalizeCompanyLabel(companyName);
  return affiliates.filter((affiliate) => normalizeCompanyLabel(affiliate.companyName) !== ownerKey);
}

function PolicyBadges({ source }: { source: JobCompanySourceView }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span
        className={cn(
          'rounded-full px-2 py-0.5 font-semibold',
          source.policy.crawlDisabled ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-muted',
        )}
      >
        {source.policy.crawlDisabled ? '수집 중단' : '수집 허용'}
      </span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 font-semibold',
          source.policy.displayDisabled ? 'bg-red-100 text-red-800' : 'bg-primary/10 text-primary',
        )}
      >
        {source.policy.displayDisabled ? '노출 중단' : '노출 중'}
      </span>
    </div>
  );
}

function SourceAdminActions({
  source,
  busy,
  onUpdate,
}: {
  source: JobCompanySourceView;
  busy: boolean;
  onUpdate: (sourceId: string, patch: AdminSourcePatch, confirmMessage?: string) => void;
}) {
  const name = source.companyName;
  const bothDisabled = source.policy.crawlDisabled && source.policy.displayDisabled;

  return (
    <div className="flex flex-wrap gap-2">
      {source.policy.displayDisabled ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              source.sourceId,
              { displayDisabled: false },
              `「${name}」 채용 정보 노출을 재개할까요?\n\n노출 중단 때 마감 처리된 공고는 자동으로 복구되지 않습니다.`,
            )
          }
          className={adminPrimaryActionClassName}
        >
          노출 재개
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              source.sourceId,
              { displayDisabled: true, reason: source.policy.reason ?? '기업 요청' },
              `「${name}」 채용 정보 노출을 중단할까요?\n\n사이트에서 해당 회사의 수집 공고가 모두 숨겨지고, 모집 중 공고는 마감 처리됩니다. 수집은 계속됩니다.`,
            )
          }
          className={adminPrimaryActionClassName}
        >
          노출 중단
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          onUpdate(
            source.sourceId,
            { crawlDisabled: source.policy.crawlDisabled ? false : true },
            source.policy.crawlDisabled
              ? `「${name}」 채용 공고 수집을 재개할까요?`
              : `「${name}」 채용 공고 수집을 중단할까요?\n\n이미 수집된 공고는 사이트에 그대로 표시됩니다.`,
          )
        }
        className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-neutral-50 disabled:opacity-60"
      >
        {source.policy.crawlDisabled ? '수집 재개' : '수집 중단'}
      </button>
      {bothDisabled ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              source.sourceId,
              { crawlDisabled: false, displayDisabled: false },
              `「${name}」 수집과 노출을 모두 재개할까요?\n\n노출 중단 때 마감 처리된 공고는 자동으로 복구되지 않습니다.`,
            )
          }
          className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-60"
        >
          수집·노출 모두 재개
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              source.sourceId,
              {
                crawlDisabled: true,
                displayDisabled: true,
                reason: source.policy.reason ?? '기업 요청',
              },
              `「${name}」 수집과 노출을 모두 중단할까요?\n\n사이트에서 해당 회사의 수집 공고가 모두 숨겨지고, 모집 중 공고는 마감 처리됩니다.`,
            )
          }
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
        >
          수집·노출 모두 중단
        </button>
      )}
    </div>
  );
}

function CompanyPolicyBadges({ policy }: { policy: CompanyPolicyView }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span
        className={cn(
          'rounded-full px-2 py-0.5 font-semibold',
          policy.crawlDisabled ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-muted',
        )}
      >
        {policy.crawlDisabled ? '수집 중단' : '수집 허용'}
      </span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 font-semibold',
          policy.displayDisabled ? 'bg-red-100 text-red-800' : 'bg-primary/10 text-primary',
        )}
      >
        {policy.displayDisabled ? '노출 중단' : '노출 중'}
      </span>
    </div>
  );
}

function CompanyAdminActions({
  sourceId,
  companyName,
  policy,
  busy,
  onUpdate,
}: {
  sourceId: string;
  companyName: string;
  policy: CompanyPolicyView;
  busy: boolean;
  onUpdate: (sourceId: string, companyName: string, patch: AdminCompanyPatch, confirmMessage?: string) => void;
}) {
  const bothDisabled = policy.crawlDisabled && policy.displayDisabled;

  return (
    <div className="flex flex-wrap gap-2">
      {policy.displayDisabled ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              sourceId,
              companyName,
              { displayDisabled: false },
              `「${companyName}」 공고 노출을 재개할까요?\n\n다른 계열사 공고에는 영향이 없습니다. 노출 중단 때 마감 처리된 공고는 자동으로 복구되지 않습니다.`,
            )
          }
          className={adminPrimaryActionClassName}
        >
          노출 재개
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              sourceId,
              companyName,
              { displayDisabled: true, reason: policy.reason ?? '기업 요청' },
              `「${companyName}」 공고만 노출을 중단할까요?\n\n다른 계열사 공고는 그대로 표시됩니다. 모집 중 공고는 마감 처리됩니다. 수집은 계속됩니다.`,
            )
          }
          className={adminPrimaryActionClassName}
        >
          노출 중단
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          onUpdate(
            sourceId,
            companyName,
            { crawlDisabled: policy.crawlDisabled ? false : true },
            policy.crawlDisabled
              ? `「${companyName}」 공고 수집을 재개할까요?\n\n다른 계열사 공고에는 영향이 없습니다.`
              : `「${companyName}」 공고 수집을 중단할까요?\n\n다른 계열사 공고는 그대로 수집·표시됩니다. 이미 수집된 공고는 사이트에 그대로 표시됩니다.`,
          )
        }
        className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-neutral-50 disabled:opacity-60"
      >
        {policy.crawlDisabled ? '수집 재개' : '수집 중단'}
      </button>
      {bothDisabled ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              sourceId,
              companyName,
              { crawlDisabled: false, displayDisabled: false },
              `「${companyName}」 수집과 노출을 모두 재개할까요?\n\n다른 계열사 공고에는 영향이 없습니다. 노출 중단 때 마감 처리된 공고는 자동으로 복구되지 않습니다.`,
            )
          }
          className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-60"
        >
          수집·노출 모두 재개
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              sourceId,
              companyName,
              {
                crawlDisabled: true,
                displayDisabled: true,
                reason: policy.reason ?? '기업 요청',
              },
              `「${companyName}」 수집과 노출을 모두 중단할까요?\n\n다른 계열사 공고는 그대로 표시됩니다. 모집 중 공고는 마감 처리됩니다.`,
            )
          }
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
        >
          수집·노출 모두 중단
        </button>
      )}
    </div>
  );
}

const AFFILIATE_GRID_INITIAL = 12;

function AffiliateGrid({
  affiliates,
  sourceId,
  selectedCompanyName,
  onSelectCompany,
  filterPlaceholder = '계열사·회사명 검색',
}: {
  affiliates: JobCompanySourceView['discoveredAffiliates'];
  sourceId?: string;
  selectedCompanyName?: string | null;
  onSelectCompany?: (companyName: string) => void;
  filterPlaceholder?: string;
}) {
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return affiliates;
    return affiliates.filter((affiliate) => affiliate.companyName.toLowerCase().includes(q));
  }, [affiliates, filter]);

  const needsPaging = !filter.trim() && filtered.length > AFFILIATE_GRID_INITIAL;
  const visible = showAll || filter.trim() ? filtered : filtered.slice(0, AFFILIATE_GRID_INITIAL);

  if (affiliates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {affiliates.length > AFFILIATE_GRID_INITIAL ? (
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={filterPlaceholder}
          className="w-full max-w-md rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
        />
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((affiliate) => {
        const selected = selectedCompanyName === affiliate.companyName;
        const cardClassName = cn(
          'rounded-lg border bg-surface px-3 py-2 text-sm transition',
          selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
          affiliate.displayDisabled || affiliate.crawlDisabled ? 'opacity-70' : undefined,
        );

        if (sourceId && onSelectCompany) {
          return (
            <li key={affiliate.companyName}>
              <button type="button" onClick={() => onSelectCompany(affiliate.companyName)} className={cn(cardClassName, 'w-full text-left hover:border-primary/40')}>
                <p className="font-medium text-foreground">{affiliate.companyName}</p>
                <p className="mt-0.5 text-xs text-muted">채용 공고 {affiliate.activeJobCount}건</p>
                {affiliate.displayDisabled || affiliate.crawlDisabled ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {affiliate.crawlDisabled ? (
                      <span className="text-xs font-semibold text-amber-800">수집 중단</span>
                    ) : null}
                    {affiliate.displayDisabled ? (
                      <span className="text-xs font-semibold text-red-700">노출 중단</span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            </li>
          );
        }

        return (
          <li key={affiliate.companyName} className={cardClassName}>
            <p className="font-medium text-foreground">{affiliate.companyName}</p>
            <p className="mt-0.5 text-xs text-muted">채용 공고 {affiliate.activeJobCount}건</p>
          </li>
        );
      })}
    </ul>
      {needsPaging && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          나머지 {(filtered.length - AFFILIATE_GRID_INITIAL).toLocaleString('ko-KR')}곳 더 보기
        </button>
      ) : null}
      {filter.trim() && filtered.length === 0 ? (
        <p className="text-sm text-muted">검색 결과가 없습니다.</p>
      ) : null}
    </div>
  );
}

function GroupExpandedContent({
  row,
  busyKey,
  selectedCompanyName,
  onSelectCompany,
  onUpdateSource,
  onUpdateCompany,
}: {
  row: JobCompanyGroupView;
  busyKey: string | null;
  selectedCompanyName: string | null;
  onSelectCompany: (companyName: string) => void;
  onUpdateSource?: (sourceId: string, patch: AdminSourcePatch, confirmMessage?: string) => void;
  onUpdateCompany?: (
    sourceId: string,
    companyName: string,
    patch: AdminCompanyPatch,
    confirmMessage?: string,
  ) => void;
}) {
  const affiliateCount = row.discoveredAffiliateTotal ?? row.discoveredAffiliates.length;
  const selectedAffiliate = row.discoveredAffiliates.find(
    (affiliate) => affiliate.companyName === selectedCompanyName,
  );

  return (
    <div className="space-y-3">
      {affiliateCount > 0 ? (
        <>
          {onUpdateCompany ? (
            <p className="text-xs text-muted">회사명을 선택하면 해당 회사 공고만 수집·노출을 관리할 수 있습니다.</p>
          ) : null}
          {affiliateCount > row.discoveredAffiliates.length ? (
            <p className="text-xs text-muted">
              공고 건수 상위 {row.discoveredAffiliates.length}곳만 표시합니다. 전체{' '}
              {affiliateCount.toLocaleString('ko-KR')}곳 · 검색으로 찾을 수 있습니다.
            </p>
          ) : null}
          <AffiliateGrid
            affiliates={row.discoveredAffiliates}
            sourceId={row.source?.sourceId}
            selectedCompanyName={selectedCompanyName}
            onSelectCompany={onSelectCompany}
          />
        </>
      ) : (
        <p className="text-sm text-muted">
          {row.crawlStatus === 'unlinked'
            ? '채용 사이트를 연결하면 매일 자동 조회합니다. 공고가 올라오면 계열사 이름이 여기에 표시됩니다.'
            : row.crawlStatus === 'pending'
              ? '채용 사이트는 연결됐지만 수집기가 아직 준비 중입니다.'
              : row.crawlStatus === 'empty'
                ? '채용 사이트는 연결됐지만 현재 등록할 수 있는 공고가 없습니다.'
                : '수집된 모집 회사명이 없습니다.'}
        </p>
      )}

      {row.source && selectedAffiliate && onUpdateCompany ? (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-surface px-3 py-3">
          <p className="text-sm font-semibold text-foreground">「{selectedAffiliate.companyName}」 관리</p>
          <CompanyPolicyBadges
            policy={{
              crawlDisabled: Boolean(selectedAffiliate.crawlDisabled),
              displayDisabled: Boolean(selectedAffiliate.displayDisabled),
              reason: selectedAffiliate.reason ?? null,
            }}
          />
          <CompanyAdminActions
            sourceId={row.source.sourceId}
            companyName={selectedAffiliate.companyName}
            policy={{
              crawlDisabled: Boolean(selectedAffiliate.crawlDisabled),
              displayDisabled: Boolean(selectedAffiliate.displayDisabled),
              reason: selectedAffiliate.reason ?? null,
            }}
            busy={busyKey === `${row.source.sourceId}::${selectedAffiliate.companyName}`}
            onUpdate={onUpdateCompany}
          />
          {selectedAffiliate.reason ? (
            <p className="text-xs text-muted">사유: {selectedAffiliate.reason}</p>
          ) : null}
        </div>
      ) : null}

      {row.source && onUpdateSource ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
          <p className="text-sm font-semibold text-foreground">채용 사이트 전체</p>
          <PolicyBadges source={row.source} />
          <SourceAdminActions
            source={row.source}
            busy={busyKey === row.source.sourceId}
            onUpdate={onUpdateSource}
          />
          {row.source.policy.reason ? (
            <p className="text-xs text-muted">사유: {row.source.policy.reason}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const ENTERPRISE_PAGE_SIZE = 25;

function enterpriseDiscoveryLabel(
  status: EnterpriseGroupCrawlStatus,
  hasCareersUrl: boolean,
): string {
  if (hasCareersUrl && (status === 'collected' || status === 'empty')) return 'URL 연결';
  if (status === 'pending') return '미탐색';
  if (status === 'unlinked') return '탐색 완료(미연결)';
  return '탐색 완료(미연결)';
}

function enterpriseActiveJobsLabel(activeJobCount: number): string {
  return activeJobCount > 0 ? `${activeJobCount.toLocaleString('ko-KR')}건` : '−';
}

function EnterpriseGroupBrowser({
  groups,
  extraSources,
  summary,
  busyKey,
  onUpdateSource,
  onUpdateCompany,
}: {
  groups: JobCompanyGroupView[];
  extraSources: JobCompanySourceView[];
  summary: JobCompaniesSummary;
  busyKey: string | null;
  onUpdateSource?: (sourceId: string, patch: AdminSourcePatch, confirmMessage?: string) => void;
  onUpdateCompany?: (
    sourceId: string,
    companyName: string,
    patch: AdminCompanyPatch,
    confirmMessage?: string,
  ) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [notFoundOnly, setNotFoundOnly] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selectedCompanyByRank, setSelectedCompanyByRank] = useState<Record<number, string>>({});

  const filteredExtras = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return extraSources;
    return extraSources.filter((source) =>
      [source.companyName, source.sourceName, source.sourceId].join(' ').toLowerCase().includes(q),
    );
  }, [extraSources, query]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((row) => {
      if (activeOnly) return false;
      if (linkedOnly && row.crawlStatus === 'unlinked') return false;
      if (notFoundOnly && row.crawlStatus !== 'unlinked') return false;
      if (pendingOnly && row.crawlStatus !== 'pending') return false;
      if (!q) return true;
      const haystack = [
        row.name,
        row.owner,
        row.sourceName ?? '',
        row.source?.companyName ?? '',
        ...row.discoveredAffiliates.map((item) => item.companyName),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [groups, query, activeOnly, linkedOnly, notFoundOnly, pendingOnly]);

  const total = filteredRows.length;
  const pageRows = filteredRows.slice(offset, offset + ENTERPRISE_PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + ENTERPRISE_PAGE_SIZE, total);

  useEffect(() => {
    setOffset(0);
    setExpandedKey(null);
  }, [query, activeOnly, linkedOnly, notFoundOnly, pendingOnly]);

  const filteredExtrasForList = useMemo(() => {
    if (activeOnly || notFoundOnly || pendingOnly) return [];
    return filteredExtras;
  }, [activeOnly, filteredExtras, notFoundOnly, pendingOnly]);

  const listTotal = total + (offset === 0 ? filteredExtrasForList.length : 0);
  const uniqueEnterpriseCount = summary.groupCount + extraSources.length;

  return (
    <Card title="목록 검색" description={COMPANY_REGISTRY_LIST_CARD_DESCRIPTION}>
      <AdminCompanyRegistryStatGrid
        uniqueCompanies={`${uniqueEnterpriseCount.toLocaleString('ko-KR')}곳`}
        linkedUrl={`${summary.linkedCount.toLocaleString('ko-KR')}곳`}
        validCert={COMPANY_REGISTRY_STAT_EMPTY}
      />

      <AdminCompanyRegistrySearchAndFilters
        searchId="enterprise-group-search"
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

      <AdminListResultMeta>{formatCompanyRegistryResultMeta(listTotal, query)}</AdminListResultMeta>

      {pageRows.length === 0 && filteredExtrasForList.length === 0 ? (
        <p className="text-sm text-muted">{COMPANY_REGISTRY_EMPTY_LIST_MESSAGE}</p>
      ) : (
        <>
          <div className={adminRegistryTableWrapClassName}>
            <table className={adminRegistryTableClassName}>
              <AdminCompanyRegistryTableHead />
              <tbody className="divide-y divide-border">
                {pageRows.map((row) => {
                  const rowKey = `group-${row.rank}`;
                  const expanded = expandedKey === rowKey;
                  const careersUrl = row.source?.careersUrl ?? row.careersUrl;

                  return (
                    <Fragment key={rowKey}>
                      <tr className="text-foreground">
                        <td className="px-3 py-2 font-medium">
                          {row.name}
                          {row.source?.policy.displayDisabled ? (
                            <span className="ml-1 text-xs font-semibold text-red-700">노출 중단</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          <RegistryTableEmptyCell />
                        </td>
                        <td className="px-3 py-2 text-muted">
                          <RegistryTableEmptyCell />
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {enterpriseDiscoveryLabel(row.crawlStatus, Boolean(careersUrl))}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {enterpriseActiveJobsLabel(row.activeJobCount)}
                        </td>
                        <td className="px-3 py-2">
                          <RegistryCareersUrlLink url={careersUrl} />
                        </td>
                        <td className="px-3 py-2">
                          <RegistryDetailButton
                            expanded={expanded}
                            onClick={() => setExpandedKey((current) => (current === rowKey ? null : rowKey))}
                          />
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-neutral-50/80">
                          <td colSpan={COMPANY_REGISTRY_TABLE_COLUMN_COUNT} className="px-3 py-3 sm:px-4">
                            <GroupExpandedContent
                              row={row}
                              busyKey={busyKey}
                              selectedCompanyName={
                                selectedCompanyByRank[row.rank] ?? row.discoveredAffiliates[0]?.companyName ?? null
                              }
                              onSelectCompany={(companyName) =>
                                setSelectedCompanyByRank((current) => ({ ...current, [row.rank]: companyName }))
                              }
                              onUpdateSource={onUpdateSource}
                              onUpdateCompany={onUpdateCompany}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {offset === 0
                  ? filteredExtrasForList.map((source) => {
                      const rowKey = `extra-${source.sourceId}`;
                      const expanded = expandedKey === rowKey;
                      const extraAffiliates = affiliatesBesidesOwner(
                        source.companyName,
                        source.discoveredAffiliates,
                      );

                      return (
                        <Fragment key={rowKey}>
                          <tr className="text-foreground">
                            <td className="px-3 py-2 font-medium">{source.companyName}</td>
                            <td className="px-3 py-2 text-muted">
                              <RegistryTableEmptyCell />
                            </td>
                            <td className="px-3 py-2 text-muted">
                              <RegistryTableEmptyCell />
                            </td>
                            <td className="px-3 py-2 text-muted">URL 연결</td>
                            <td className="px-3 py-2 text-muted">
                              {enterpriseActiveJobsLabel(source.activeJobCount)}
                            </td>
                            <td className="px-3 py-2">
                              <RegistryCareersUrlLink url={source.careersUrl} />
                            </td>
                            <td className="px-3 py-2">
                              <RegistryDetailButton
                                expanded={expanded}
                                onClick={() => setExpandedKey((current) => (current === rowKey ? null : rowKey))}
                              />
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="bg-neutral-50/80">
                              <td colSpan={COMPANY_REGISTRY_TABLE_COLUMN_COUNT} className="px-3 py-3 sm:px-4">
                                <div className="space-y-3">
                                  <PolicyBadges source={source} />
                                  {onUpdateSource ? (
                                    <SourceAdminActions
                                      source={source}
                                      busy={busyKey === source.sourceId}
                                      onUpdate={onUpdateSource}
                                    />
                                  ) : null}
                                  {extraAffiliates.length > 0 ? (
                                    <AffiliateGrid affiliates={extraAffiliates} sourceId={source.sourceId} />
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>

          <AdminListPagination
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            total={total}
            prevDisabled={offset === 0}
            nextDisabled={offset + ENTERPRISE_PAGE_SIZE >= total}
            onPrev={() => setOffset((value) => Math.max(0, value - ENTERPRISE_PAGE_SIZE))}
            onNext={() => setOffset((value) => value + ENTERPRISE_PAGE_SIZE)}
          />
        </>
      )}
    </Card>
  );
}

type CompaniesSegment = 'enterprise' | 'mid-sized';

const SEGMENT_TABS: Array<{ id: CompaniesSegment; label: string }> = [
  { id: 'enterprise', label: '대기업·계열사' },
  { id: 'mid-sized', label: '중견기업' },
];

export default function JobCompaniesPanel({
  data,
  error,
  loading = false,
  busyKey = null,
  onUpdateSource,
  onUpdateCompany,
}: {
  data: JobCompaniesPayload;
  error?: string | null;
  loading?: boolean;
  busyKey?: string | null;
  onUpdateSource?: (sourceId: string, patch: AdminSourcePatch, confirmMessage?: string) => void;
  onUpdateCompany?: (
    sourceId: string,
    companyName: string,
    patch: AdminCompanyPatch,
    confirmMessage?: string,
  ) => void;
}) {
  const [segment, setSegment] = useState<CompaniesSegment>('enterprise');
  const { summary, groups, extraSources, crawlMeta } = data;
  const enterpriseSiteCount = groups.length + extraSources.length;

  return (
    <div className={cn('space-y-5', loading && 'opacity-70')}>
      <PageHeader
        title="채용 공고 회사"
        description="공고를 가져오는 채용 사이트·회사를 보고, 수집·사이트 노출을 켜거나 끕니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div
        className="flex gap-1 rounded-xl border border-border bg-surface p-1"
        role="tablist"
        aria-label="채용 공고 회사 구분"
      >
        {SEGMENT_TABS.map((item) => {
          const active = segment === item.id;
          const countLabel =
            item.id === 'enterprise'
              ? `${enterpriseSiteCount.toLocaleString('ko-KR')}곳`
              : `${crawlMeta.midSizedRegistry.careersUrlLinkedCount.toLocaleString('ko-KR')}곳`;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSegment(item.id)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:flex-row sm:justify-center sm:gap-2',
                active ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-neutral-100 hover:text-foreground',
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  active ? 'text-white/90' : 'text-subtle',
                )}
              >
                {countLabel}
              </span>
            </button>
          );
        })}
      </div>

      {segment === 'enterprise' ? (
        <div className="space-y-4" role="tabpanel">
          <EnterpriseGroupBrowser
            groups={groups}
            extraSources={extraSources}
            summary={summary}
            busyKey={busyKey}
            onUpdateSource={onUpdateSource}
            onUpdateCompany={onUpdateCompany}
          />
        </div>
      ) : (
        <div className="space-y-4" role="tabpanel">
          <MidSizedRegistryBrowser />
        </div>
      )}
    </div>
  );
}

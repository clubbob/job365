'use client';

import { useMemo, useState, type ReactNode } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { adminPrimaryActionClassName } from '@/lib/admin-ui';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';
import type { EnterpriseGroupCrawlStatus } from '@/lib/crawler/enterprise-group-rows';
import type {
  JobCompaniesPayload,
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

function statusLabel(status: EnterpriseGroupCrawlStatus, activeJobCount: number) {
  if (status === 'collected') return `채용 공고 ${activeJobCount}개`;
  if (status === 'empty') return '공고 없음';
  if (status === 'pending') return '연결 예정';
  return '채용 사이트 미연결';
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

function AffiliateGrid({
  affiliates,
  sourceId,
  selectedCompanyName,
  onSelectCompany,
}: {
  affiliates: JobCompanySourceView['discoveredAffiliates'];
  sourceId?: string;
  selectedCompanyName?: string | null;
  onSelectCompany?: (companyName: string) => void;
}) {
  if (affiliates.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {affiliates.map((affiliate) => {
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
  const affiliateCount = row.discoveredAffiliates.length;
  const selectedAffiliate = row.discoveredAffiliates.find(
    (affiliate) => affiliate.companyName === selectedCompanyName,
  );

  return (
    <div className="space-y-3 border-t border-border bg-neutral-50/80 px-3 py-3 sm:px-4 sm:pl-11">
      {affiliateCount > 0 ? (
        <>
          {onUpdateCompany ? (
            <p className="text-xs text-muted">회사명을 선택하면 해당 회사 공고만 수집·노출을 관리할 수 있습니다.</p>
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

function EnterpriseGroupList({
  groups,
  query,
  busyKey,
  onUpdateSource,
  onUpdateCompany,
}: {
  groups: JobCompanyGroupView[];
  query: string;
  busyKey: string | null;
  onUpdateSource?: (sourceId: string, patch: AdminSourcePatch, confirmMessage?: string) => void;
  onUpdateCompany?: (
    sourceId: string,
    companyName: string,
    patch: AdminCompanyPatch,
    confirmMessage?: string,
  ) => void;
}) {
  const [expandedRank, setExpandedRank] = useState<number | null>(null);
  const [selectedCompanyByRank, setSelectedCompanyByRank] = useState<Record<number, string>>({});

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;

    return groups.filter((row) => {
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
  }, [groups, query]);

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {filteredRows.map((row) => {
        const expanded = expandedRank === row.rank;
        const affiliateCount = row.discoveredAffiliates.length;
        const careersUrl = row.source?.careersUrl ?? row.careersUrl;

        return (
          <li key={row.rank}>
            <button
              type="button"
              onClick={() => setExpandedRank((current) => (current === row.rank ? null : row.rank))}
              className="flex w-full items-center gap-2 px-3 py-3 text-left transition hover:bg-neutral-50 sm:gap-3 sm:px-4"
              aria-expanded={expanded}
            >
              <span
                className={cn('shrink-0 text-muted transition-transform', expanded ? 'rotate-90' : 'rotate-0')}
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
                {row.source?.policy.displayDisabled ? (
                  <span className="text-xs font-semibold text-red-700">노출 중단됨</span>
                ) : null}
              </span>
              {careersUrl ? (
                <a
                  href={careersUrl}
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
              <GroupExpandedContent
                row={row}
                busyKey={busyKey}
                selectedCompanyName={selectedCompanyByRank[row.rank] ?? row.discoveredAffiliates[0]?.companyName ?? null}
                onSelectCompany={(companyName) =>
                  setSelectedCompanyByRank((current) => ({ ...current, [row.rank]: companyName }))
                }
                onUpdateSource={onUpdateSource}
                onUpdateCompany={onUpdateCompany}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function EnterpriseGroupSearchResults({
  groups,
  query,
  children,
}: {
  groups: JobCompanyGroupView[];
  query: string;
  children: ReactNode;
}) {
  const q = query.trim().toLowerCase();
  const hasQuery = Boolean(q);
  const hasMatches =
    !hasQuery ||
    groups.some((row) => {
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

  if (hasQuery && !hasMatches) {
    return <p className="text-sm text-muted">검색 결과가 없습니다.</p>;
  }

  return <>{children}</>;
}

function StandaloneSourceList({
  sources,
  busyKey,
  onUpdateSource,
}: {
  sources: JobCompanySourceView[];
  busyKey: string | null;
  onUpdateSource?: (sourceId: string, patch: AdminSourcePatch, confirmMessage?: string) => void;
}) {
  if (sources.length === 0) return null;

  return (
    <Card title="기타 채용 사이트">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {sources.map((source) => (
          <li key={source.sourceId} className="space-y-3 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{source.companyName}</p>
                <p className="text-sm text-muted">{source.sourceName}</p>
                <p className="mt-1 text-xs text-muted">채용 공고 {source.activeJobCount}건</p>
                <a
                  href={source.careersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-primary underline decoration-primary/30 underline-offset-[3px]"
                >
                  채용 사이트
                </a>
              </div>
              <PolicyBadges source={source} />
            </div>

            {source.discoveredAffiliates.length > 0 ? (
              <AffiliateGrid affiliates={source.discoveredAffiliates} sourceId={source.sourceId} />
            ) : null}

            {onUpdateSource ? (
              <div className="space-y-2">
                <SourceAdminActions
                  source={source}
                  busy={busyKey === source.sourceId}
                  onUpdate={onUpdateSource}
                />
                {source.policy.reason ? <p className="text-xs text-muted">사유: {source.policy.reason}</p> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function JobCompaniesPanel({
  data,
  error,
  busyKey = null,
  onUpdateSource,
  onUpdateCompany,
}: {
  data: JobCompaniesPayload;
  error?: string | null;
  busyKey?: string | null;
  onUpdateSource?: (sourceId: string, patch: AdminSourcePatch, confirmMessage?: string) => void;
  onUpdateCompany?: (
    sourceId: string,
    companyName: string,
    patch: AdminCompanyPatch,
    confirmMessage?: string,
  ) => void;
}) {
  const [query, setQuery] = useState('');
  const { summary, groups, standaloneSources } = data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="채용 공고 회사"
        description="대기업·계열사 채용 사이트와 수집·노출 설정을 한곳에서 관리합니다. 기업 이의 제기 시 노출 중단만 누르면 됩니다."
        homeHref="/admin"
        homeLabel="관리 홈"
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">수집 일정</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{CRAWL_SCHEDULE.label}</p>
            <p className="text-xs text-subtle">cron UTC {CRAWL_SCHEDULE.cronUtc}</p>
          </div>
          <div>
            <p className="text-xs text-muted">모집 중 채용 공고</p>
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
            <p className="text-xs text-muted">노출·수집 상태</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              회사 노출 중단 {summary.companyDisplayDisabledCount} · 사이트 노출 중단 {summary.displayDisabledCount}
            </p>
            <p className="text-xs text-subtle">
              연결 예정 {summary.pendingCount} · 미연결 {summary.unlinkedCount}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <p className="font-semibold">기업 이의 제기 대응</p>
          <p className="mt-1 text-muted">
            회사명을 선택해 해당 회사만 노출 중단하거나, 채용 사이트 전체를 한 번에 관리할 수 있습니다.
          </p>
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

        <EnterpriseGroupSearchResults groups={groups} query={query}>
          <EnterpriseGroupList
            groups={groups}
            query={query}
            busyKey={busyKey}
            onUpdateSource={onUpdateSource}
            onUpdateCompany={onUpdateCompany}
          />
        </EnterpriseGroupSearchResults>

        {groups.length === 0 ? (
          <p className="mt-3 text-sm text-muted">표시할 채용 사이트가 없습니다.</p>
        ) : null}
      </Card>

      <StandaloneSourceList sources={standaloneSources} busyKey={busyKey} onUpdateSource={onUpdateSource} />
    </div>
  );
}

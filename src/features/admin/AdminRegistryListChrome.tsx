'use client';

import type { ReactNode } from 'react';
import GroupedPagination from '@/components/navigation/GroupedPagination';
import { cn } from '@/lib/utils';

export type AdminListStatItem = { label: string; value: ReactNode };

export function AdminListStatGrid({
  items,
  columns = 4,
}: {
  items: AdminListStatItem[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        'mb-4 grid gap-2 rounded-lg border border-border bg-neutral-50 px-3 py-3 text-sm sm:grid-cols-2',
        columns === 2 && 'lg:grid-cols-2',
        columns === 3 && 'lg:grid-cols-3',
        columns === 4 && 'lg:grid-cols-4',
      )}
    >
      {items.map((item) => (
        <p key={item.label}>
          <span className="text-muted">{item.label} </span>
          <span className="font-semibold text-foreground">{item.value}</span>
        </p>
      ))}
    </div>
  );
}

export function AdminListSearchField({
  id,
  value,
  onChange,
  placeholder,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <input
      id={id}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground sm:min-w-[14rem]"
    />
  );
}

export function AdminListFilterCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-border"
      />
      {label}
    </label>
  );
}

export function AdminListResultMeta({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-xs text-subtle">{children}</p>;
}

export function AdminListPagination({
  page,
  totalPages,
  total,
  pageSize,
  loading = false,
  onPageChange,
  ariaLabel = '목록 페이지',
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
}) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-subtle">
        {rangeStart}–{rangeEnd} / {total.toLocaleString('ko-KR')}
        {totalPages > 1 ? ` · ${page}/${totalPages}페이지` : ''}
        {loading ? ' · 불러오는 중…' : ''}
      </p>
      <GroupedPagination
        page={page}
        totalPages={totalPages}
        loading={loading}
        onPageChange={onPageChange}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}

export const adminRegistryTableClassName = 'w-full min-w-[44rem] text-left text-sm';
export const adminRegistryTableHeadClassName = 'border-b border-border bg-neutral-50 text-xs text-muted';
export const adminRegistryTableWrapClassName = 'overflow-x-auto rounded-lg border border-border';

/** 대기업·중견 탭 공통 목록 열 */
export const COMPANY_REGISTRY_TABLE_COLUMNS = [
  '기업명',
  '사업자번호',
  '모집 공고',
  '채용 URL',
] as const;

export const COMPANY_REGISTRY_LIST_CARD_DESCRIPTION =
  '명단에 있는 회사만 표시합니다. 모집 공고 건수는 수집 출처별 활성 공고입니다(대기업·계열은 공시 집단 명단). 없는 값은 −로 표시합니다.';

export const COMPANY_REGISTRY_SEARCH_PLACEHOLDER = '기업명 검색';

export const COMPANY_REGISTRY_EMPTY_LIST_MESSAGE = '조건에 맞는 항목이 없습니다.';

export const COMPANY_REGISTRY_STAT_EMPTY = '−';

export function AdminCompanyRegistryStatGrid({
  uniqueCompanies,
  uniqueCompaniesLabel = '전체 기업',
  linkedUrl,
}: {
  uniqueCompanies: ReactNode;
  uniqueCompaniesLabel?: string;
  linkedUrl: ReactNode;
}) {
  return (
    <AdminListStatGrid
      columns={2}
      items={[
        { label: uniqueCompaniesLabel, value: uniqueCompanies },
        { label: '채용 URL 연결', value: linkedUrl },
      ]}
    />
  );
}

export function AdminCompanyRegistrySearchAndFilters({
  searchId,
  query,
  onQueryChange,
}: {
  searchId: string;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="mb-4">
      <AdminListSearchField
        id={searchId}
        label={COMPANY_REGISTRY_SEARCH_PLACEHOLDER}
        value={query}
        onChange={onQueryChange}
        placeholder={COMPANY_REGISTRY_SEARCH_PLACEHOLDER}
      />
    </div>
  );
}

export function formatCompanyRegistryResultMeta(total: number, query: string): string {
  const base = `조회 결과 ${total.toLocaleString('ko-KR')}건`;
  return query.trim() ? `${base} · 검색 적용` : base;
}

export function RegistryTableEmptyCell() {
  return <span className="text-muted">−</span>;
}

export function formatRegistryActiveJobCount(activeJobCount: number): string {
  return activeJobCount > 0 ? `${activeJobCount.toLocaleString('ko-KR')}건` : '−';
}

export function AdminCompanyRegistryTableHead() {
  return (
    <thead className={adminRegistryTableHeadClassName}>
      <tr>
        {COMPANY_REGISTRY_TABLE_COLUMNS.map((label) => (
          <th key={label} className="px-3 py-2 font-semibold">
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function RegistryCareersUrlLink({ url }: { url: string | null | undefined }) {
  if (!url) return <RegistryTableEmptyCell />;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-primary/30 underline-offset-[3px]"
    >
      열기
    </a>
  );
}

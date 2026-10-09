import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AdminListStatItem = { label: string; value: ReactNode };

export function AdminListStatGrid({
  items,
  columns = 4,
}: {
  items: AdminListStatItem[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className={cn(
        'mb-4 grid gap-2 rounded-lg border border-border bg-neutral-50 px-3 py-3 text-sm sm:grid-cols-2',
        columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4',
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
  rangeStart,
  rangeEnd,
  total,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
      <span>
        {rangeStart}–{rangeEnd} / {total.toLocaleString('ko-KR')}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={prevDisabled}
          onClick={onPrev}
          className={cn(
            'rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          이전
        </button>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={onNext}
          className={cn(
            'rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          다음
        </button>
      </div>
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
  '인증',
  '탐색',
  '모집 공고',
  '채용 URL',
  '상세',
] as const;

export const COMPANY_REGISTRY_TABLE_COLUMN_COUNT = COMPANY_REGISTRY_TABLE_COLUMNS.length;

export const COMPANY_REGISTRY_LIST_CARD_DESCRIPTION =
  '기업·채용 사이트 목록입니다. 「상세」에서 수집·노출을 바꿀 수 있습니다. 아직 없는 값은 −로 표시합니다. 모집 공고는 상단 메뉴 「수집 채용 공고」에서 확인합니다.';

export const COMPANY_REGISTRY_SEARCH_PLACEHOLDER = '기업명·사업자번호 검색';

export const COMPANY_REGISTRY_EMPTY_LIST_MESSAGE = '조건에 맞는 항목이 없습니다.';

export const COMPANY_REGISTRY_STAT_EMPTY = '−';

export function AdminCompanyRegistryStatGrid({
  uniqueCompanies,
  linkedUrl,
  validCert,
}: {
  uniqueCompanies: ReactNode;
  linkedUrl: ReactNode;
  validCert: ReactNode;
}) {
  return (
    <AdminListStatGrid
      columns={3}
      items={[
        { label: '고유 기업', value: uniqueCompanies },
        { label: '채용 URL 연결', value: linkedUrl },
        { label: '유효 인증', value: validCert },
      ]}
    />
  );
}

export type CompanyRegistryFilterState = {
  activeOnly: boolean;
  linkedOnly: boolean;
  notFoundOnly: boolean;
  pendingOnly: boolean;
};

export function AdminCompanyRegistrySearchAndFilters({
  searchId,
  query,
  onQueryChange,
  filters,
}: {
  searchId: string;
  query: string;
  onQueryChange: (value: string) => void;
  filters: CompanyRegistryFilterState & {
    onActiveOnly: (value: boolean) => void;
    onLinkedOnly: (value: boolean) => void;
    onNotFoundOnly: (value: boolean) => void;
    onPendingOnly: (value: boolean) => void;
  };
}) {
  const { activeOnly, linkedOnly, notFoundOnly, pendingOnly, onActiveOnly, onLinkedOnly, onNotFoundOnly, onPendingOnly } =
    filters;

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <AdminListSearchField
        id={searchId}
        label={COMPANY_REGISTRY_SEARCH_PLACEHOLDER}
        value={query}
        onChange={onQueryChange}
        placeholder={COMPANY_REGISTRY_SEARCH_PLACEHOLDER}
      />
      <AdminListFilterCheckbox checked={activeOnly} onChange={onActiveOnly} label="유효 인증만" />
      <AdminListFilterCheckbox checked={linkedOnly} onChange={onLinkedOnly} label="URL 연결만" />
      <AdminListFilterCheckbox checked={notFoundOnly} onChange={onNotFoundOnly} label="탐색 완료(미연결)" />
      <AdminListFilterCheckbox checked={pendingOnly} onChange={onPendingOnly} label="미탐색만" />
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

export function RegistryDetailButton({
  expanded = false,
  disabled = false,
  onClick,
}: {
  expanded?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-foreground',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-neutral-50',
      )}
      aria-expanded={disabled ? undefined : expanded}
    >
      {expanded ? '접기' : '상세'}
    </button>
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

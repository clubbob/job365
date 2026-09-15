import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { firstRequiredError } from '@/lib/form-required';
import type { BizVerifyStatus } from '@/lib/nts-business-status';
import type { JobCompanyInfo } from '@/types/job';

export type { BizVerifyStatus };

export type BizVerifyRecord = {
  businessNumber: string;
  companyName: string;
  status: BizVerifyStatus;
  statusLabel: string;
  taxType: string | null;
  verifiedAt: string;
  source: 'nts';
  ceo?: string;
  address?: string;
  phone?: string;
  fax?: string;
  foundedOn?: string;
  employeeCount?: string;
  lastYearRevenue?: string;
  website?: string;
  intro?: string;
  registrantName?: string;
  registrantEmail?: string;
};

const STORAGE_KEY = 'job365.bizVerify';
const STATUSES: BizVerifyStatus[] = ['active', 'suspended', 'closed', 'not_found'];

type Store = Record<string, BizVerifyRecord>;

let memoryStore: Store = {};

function isStore(value: unknown): value is Store {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalDigits(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/[^\d]/g, '');
  return digits || undefined;
}

export function parseBizVerifyRecord(value: unknown): BizVerifyRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const companyName = typeof record.companyName === 'string' ? record.companyName.trim() : '';
  const businessNumber = formatBusinessNumber(String(record.businessNumber ?? ''));
  if (!companyName && digitsOnly(businessNumber).length !== 10) return null;

  const status = STATUSES.includes(record.status as BizVerifyStatus)
    ? (record.status as BizVerifyStatus)
    : 'active';

  return {
    businessNumber,
    companyName,
    status,
    statusLabel:
      typeof record.statusLabel === 'string' && record.statusLabel.trim()
        ? record.statusLabel.trim()
        : status === 'active'
          ? '계속사업자'
          : '',
    taxType: typeof record.taxType === 'string' && record.taxType.trim() ? record.taxType.trim() : null,
    verifiedAt: typeof record.verifiedAt === 'string' && record.verifiedAt ? record.verifiedAt : new Date().toISOString(),
    source: 'nts',
    ceo: optionalText(record.ceo),
    address: optionalText(record.address),
    phone: optionalText(record.phone),
    fax: optionalText(record.fax),
    foundedOn: optionalText(record.foundedOn),
    employeeCount: optionalDigits(record.employeeCount),
    lastYearRevenue: optionalDigits(record.lastYearRevenue),
    website: optionalText(record.website),
    intro: optionalText(record.intro),
    registrantName: optionalText(record.registrantName),
    registrantEmail: optionalText(record.registrantEmail),
  };
}

function readStore(): Store {
  if (typeof window === 'undefined') return { ...memoryStore };
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('job365.bizVerifySim');
    if (!raw) return { ...memoryStore };
    const parsed = JSON.parse(raw) as unknown;
    if (!isStore(parsed)) return { ...memoryStore };
    memoryStore = parsed;
    return parsed;
  } catch {
    return { ...memoryStore };
  }
}

function writeStore(store: Store): void {
  memoryStore = store;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 브라우저 저장이 막혀도 같은 세션의 메모리에는 남깁니다.
  }
}

export function loadBizVerify(userId: string): BizVerifyRecord | null {
  if (!userId) return null;
  return parseBizVerifyRecord(readStore()[userId]);
}

export function toJobCompanyInfo(record: BizVerifyRecord | null | undefined): JobCompanyInfo | undefined {
  if (!record) return undefined;
  return {
    companyName: record.companyName.trim() || undefined,
    businessNumber: record.businessNumber.trim() || undefined,
    ceo: record.ceo,
    address: record.address,
    phone: record.phone,
    fax: record.fax,
    foundedOn: record.foundedOn,
    employeeCount: record.employeeCount,
    lastYearRevenue: record.lastYearRevenue,
    website: record.website,
    intro: record.intro,
    registrantName: record.registrantName,
    registrantEmail: record.registrantEmail,
  };
}

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function hasDigits(value?: string | null): boolean {
  return Boolean(value?.replace(/[^\d]/g, ''));
}

export function missingJobCompanyMessage(input?: JobCompanyInfo | null): string | null {
  return firstRequiredError([
    { ok: hasText(input?.companyName), message: '회사명을 입력해 주세요.' },
    { ok: hasText(input?.ceo), message: '대표자명을 입력해 주세요.' },
    { ok: hasText(input?.phone), message: '전화번호를 입력해 주세요.' },
    { ok: hasText(input?.foundedOn), message: '설립일을 입력해 주세요.' },
    { ok: hasDigits(input?.employeeCount), message: '직원 수를 입력해 주세요.' },
    { ok: hasDigits(input?.lastYearRevenue), message: '전년 매출액을 입력해 주세요.' },
    { ok: hasText(input?.address), message: '사업장 주소를 입력해 주세요.' },
    { ok: hasText(input?.intro), message: '회사 소개를 입력해 주세요.' },
  ]);
}

export function isJobCompanyComplete(company?: JobCompanyInfo | null): boolean {
  return !missingJobCompanyMessage(company);
}

export function missingCompanyInfoMessage(input: {
  companyName?: string;
  ceo?: string;
  phone?: string;
  foundedOn?: string;
  employeeCount?: string;
  lastYearRevenue?: string;
  address?: string;
  intro?: string;
  registrantName?: string;
  registrantEmail?: string;
}): string | null {
  return firstRequiredError([
    { ok: hasText(input.companyName), message: '회사명을 입력해 주세요.' },
    { ok: hasText(input.ceo), message: '대표자명을 입력해 주세요.' },
    { ok: hasText(input.phone), message: '전화번호를 입력해 주세요.' },
    { ok: hasText(input.foundedOn), message: '설립일을 입력해 주세요.' },
    { ok: hasDigits(input.employeeCount), message: '직원 수를 입력해 주세요.' },
    { ok: hasDigits(input.lastYearRevenue), message: '전년 매출액을 입력해 주세요.' },
    { ok: hasText(input.address), message: '사업장 주소를 입력해 주세요.' },
    { ok: hasText(input.intro), message: '회사 소개를 입력해 주세요.' },
    { ok: hasText(input.registrantName), message: '등록자 이름을 확인할 수 없습니다. 내 계정 이름을 확인해 주세요.' },
    { ok: hasText(input.registrantEmail), message: '로그인 이메일을 확인할 수 없습니다.' },
  ]);
}

export function isCompanyInfoComplete(record: BizVerifyRecord | null): boolean {
  return Boolean(record && record.status === 'active' && !missingCompanyInfoMessage(record));
}

export function saveBizVerify(userId: string, record: BizVerifyRecord): BizVerifyRecord {
  const merged = parseBizVerifyRecord({ ...readStore()[userId], ...record });
  if (!merged) return record;
  const store = { ...readStore(), [userId]: merged };
  writeStore(store);
  return merged;
}

export function clearBizVerify(userId: string): void {
  const store = { ...readStore() };
  delete store[userId];
  writeStore(store);
}

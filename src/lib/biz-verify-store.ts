import { formatBusinessNumber } from '@/lib/business-number';
import type { BizVerifyStatus } from '@/lib/nts-business-status';

export type { BizVerifyStatus };

export type BizVerifyRecord = {
  businessNumber: string;
  companyName: string;
  status: BizVerifyStatus;
  statusLabel: string;
  taxType: string | null;
  verifiedAt: string;
  source: 'nts';
};

const STORAGE_KEY = 'job365.bizVerify';

type Store = Record<string, BizVerifyRecord>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('job365.bizVerifySim');
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadBizVerify(userId: string): BizVerifyRecord | null {
  const record = readStore()[userId];
  if (!record || record.status !== 'active' || !record.companyName?.trim()) return null;
  return {
    ...record,
    businessNumber: formatBusinessNumber(record.businessNumber),
    statusLabel: record.statusLabel || '계속사업자',
    taxType: record.taxType ?? null,
    source: 'nts',
  };
}

export function saveBizVerify(userId: string, record: BizVerifyRecord): void {
  const store = readStore();
  store[userId] = record;
  writeStore(store);
}

export function clearBizVerify(userId: string): void {
  const store = readStore();
  delete store[userId];
  writeStore(store);
}

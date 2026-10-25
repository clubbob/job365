import { digitsOnly } from '@/lib/business-number';
import { normalizeApplyUrlForDedupe } from '@/lib/job-board/dedupe-list-jobs';
import { isStorableCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';

/** 명단 1행 = 법인 1곳 — 10자리 사업자번호 */
export function normalizeRegistryBusinessNumberDigits(
  value: string | null | undefined,
): string | null {
  const digits = digitsOnly(value ?? '');
  return digits.length === 10 ? digits : null;
}

export function hasRegistryBusinessNumber(value: string | null | undefined): boolean {
  return normalizeRegistryBusinessNumberDigits(value) !== null;
}

export function normalizeRegistryCareersUrlKey(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? '';
  if (!trimmed || !isStorableCareersUrl(trimmed)) return null;
  return normalizeApplyUrlForDedupe(trimmed) ?? trimmed;
}

/** 회사별 전용 사업자번호 + 채용 URL이 모두 있을 때만 수집·연결 완료로 봅니다. */
export function isCompleteRegistryCompanyIdentity(record: {
  businessNumber?: string | null;
  careersUrl?: string | null;
}): boolean {
  return (
    hasRegistryBusinessNumber(record.businessNumber) &&
    normalizeRegistryCareersUrlKey(record.careersUrl) !== null
  );
}

export type RegistryIdentityDedupeResult<T> = {
  rows: T[];
  droppedDuplicateBusinessNumber: number;
  droppedDuplicateCareersUrl: number;
  droppedIncompleteIdentity: number;
};

/** 사업자번호·채용 URL 각각 명단 내 1회만 허용. 불완전 행은 제외(옵션). */
export function dedupeRegistryRowsByBusinessNumberAndUrl<T extends {
  businessNumber?: string | null;
  careersUrl?: string | null;
}>(
  rows: T[],
  options?: { requireCompleteIdentity?: boolean },
): RegistryIdentityDedupeResult<T> {
  const requireComplete = options?.requireCompleteIdentity ?? true;
  const seenBn = new Set<string>();
  const seenUrl = new Set<string>();
  const out: T[] = [];
  let droppedDuplicateBusinessNumber = 0;
  let droppedDuplicateCareersUrl = 0;
  let droppedIncompleteIdentity = 0;

  for (const row of rows) {
    if (requireComplete && !isCompleteRegistryCompanyIdentity(row)) {
      droppedIncompleteIdentity += 1;
      continue;
    }
    const bn = normalizeRegistryBusinessNumberDigits(row.businessNumber);
    const urlKey = normalizeRegistryCareersUrlKey(row.careersUrl);
    if (!bn || !urlKey) {
      if (requireComplete) droppedIncompleteIdentity += 1;
      else out.push(row);
      continue;
    }
    if (seenBn.has(bn)) {
      droppedDuplicateBusinessNumber += 1;
      continue;
    }
    if (seenUrl.has(urlKey)) {
      droppedDuplicateCareersUrl += 1;
      continue;
    }
    seenBn.add(bn);
    seenUrl.add(urlKey);
    out.push(row);
  }

  return {
    rows: out,
    droppedDuplicateBusinessNumber,
    droppedDuplicateCareersUrl,
    droppedIncompleteIdentity,
  };
}

export function isRegistryRowLinked(record: {
  businessNumber?: string | null;
  careersUrl?: string | null;
}): boolean {
  return isCompleteRegistryCompanyIdentity(record);
}

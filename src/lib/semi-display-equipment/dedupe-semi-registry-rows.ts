import { digitsOnly } from '@/lib/business-number';
import { normalizeApplyUrlForDedupe } from '@/lib/job-board/dedupe-list-jobs';
import type { SeedCareersDbCompany } from '@/lib/seed-careers/types';
import { semiEquipmentSeedNormalizeKey } from '@/lib/semi-display-equipment/master-seed';
import { loadSemiconKorea2026Exhibitors } from '@/lib/semi-display-equipment/semicon-exhibitors';

function exhibitorWebsiteHostForCompanyName(companyName: string): string | null {
  const row = loadSemiconKorea2026Exhibitors().find(
    (item) => item.companyName.trim() === companyName.trim(),
  );
  return careersUrlHostKey(row?.websiteUrl);
}

function careersUrlHostKey(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const normalized = normalizeApplyUrlForDedupe(trimmed) ?? trimmed;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** 명단 순서 유지 — 먼저 나온 행(한글 마스터)을 남기고 사업자번호·채용 사이트 호스트 중복 제거 */
export function dedupeSemiSeedRegistryDbCompanies(rows: SeedCareersDbCompany[]): SeedCareersDbCompany[] {
  const out: SeedCareersDbCompany[] = [];
  const seenNorm = new Set<string>();
  const seenBn = new Set<string>();
  const seenHost = new Set<string>();

  for (const row of rows) {
    const norm = semiEquipmentSeedNormalizeKey(row.companyName);
    if (norm && seenNorm.has(norm)) continue;

    const bnDigits = digitsOnly(row.businessNumber ?? '');
    if (bnDigits.length === 10 && seenBn.has(bnDigits)) continue;

    const host = careersUrlHostKey(row.careersUrl);
    const websiteHost = exhibitorWebsiteHostForCompanyName(row.companyName);
    const hostKey = host ?? websiteHost;
    if (hostKey && seenHost.has(hostKey)) continue;

    if (norm) seenNorm.add(norm);
    if (bnDigits.length === 10) seenBn.add(bnDigits);
    if (hostKey) seenHost.add(hostKey);
    out.push(row);
  }

  return out;
}

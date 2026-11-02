import { companyLabelsMatch } from '@/lib/crawler/company-name-match';
import { digitsOnly } from '@/lib/business-number';
import { normalizeApplyUrlForDedupe } from '@/lib/job-board/dedupe-list-jobs';
import { loadSeedCareersCrawlTargets } from '@/lib/seed-careers/crawl-targets';
import { loadSemiconKorea2026Exhibitors } from '@/lib/semi-display-equipment/semicon-exhibitors';
import {
  isMasterSeedSemiDisplayEquipmentCompany,
  semiEquipmentSeedNormalizeKey,
} from '@/lib/semi-display-equipment/master-seed';

export type SemiSeedNameIndex = {
  normKeys: Set<string>;
  businessNumberToName: Map<string, string>;
  careersHostToName: Map<string, string>;
};

function hasHangul(name: string): boolean {
  return /[가-힣]/.test(name);
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

type TargetMeta = { businessNumberDigits: string | null; careersUrl: string | null };

function loadSemiTargetMetaByNorm(): Map<string, TargetMeta> {
  const map = new Map<string, TargetMeta>();
  for (const target of loadSeedCareersCrawlTargets('semi-equipment')) {
    const norm = semiEquipmentSeedNormalizeKey(target.name);
    if (!norm) continue;
    const digits = digitsOnly(target.businessNumber ?? '');
    map.set(norm, {
      businessNumberDigits: digits.length === 10 ? digits : null,
      careersUrl: target.careersUrl?.trim() || null,
    });
  }
  return map;
}

function targetMetaForName(name: string, byNorm: Map<string, TargetMeta>): TargetMeta {
  const norm = semiEquipmentSeedNormalizeKey(name);
  if (!norm) return { businessNumberDigits: null, careersUrl: null };
  return byNorm.get(norm) ?? { businessNumberDigits: null, careersUrl: null };
}

/** 마스터 시드(한글) 표기를 SEMICON 영문명보다 우선합니다. */
export function preferSemiDisplayCompanyName(a: string, b: string): string {
  const aMaster = isMasterSeedSemiDisplayEquipmentCompany(a);
  const bMaster = isMasterSeedSemiDisplayEquipmentCompany(b);
  if (aMaster && !bMaster) return a;
  if (bMaster && !aMaster) return b;
  const aKo = hasHangul(a);
  const bKo = hasHangul(b);
  if (aKo && !bKo) return a;
  if (bKo && !aKo) return b;
  return a;
}

export function createSemiSeedNameIndex(): SemiSeedNameIndex {
  return {
    normKeys: new Set(),
    businessNumberToName: new Map(),
    careersHostToName: new Map(),
  };
}

export function registerSemiSeedCompanyName(
  companyName: string,
  index: SemiSeedNameIndex,
  targetByNorm: Map<string, TargetMeta>,
): boolean {
  const trimmed = companyName.trim();
  if (!trimmed) return false;
  const norm = semiEquipmentSeedNormalizeKey(trimmed);
  if (!norm || index.normKeys.has(norm)) return false;

  index.normKeys.add(norm);
  const meta = targetMetaForName(trimmed, targetByNorm);
  if (meta.businessNumberDigits) {
    const existing = index.businessNumberToName.get(meta.businessNumberDigits);
    index.businessNumberToName.set(
      meta.businessNumberDigits,
      existing ? preferSemiDisplayCompanyName(existing, trimmed) : trimmed,
    );
  }
  const careersHost = careersUrlHostKey(meta.careersUrl);
  if (careersHost) {
    const existing = index.careersHostToName.get(careersHost);
    index.careersHostToName.set(
      careersHost,
      existing ? preferSemiDisplayCompanyName(existing, trimmed) : trimmed,
    );
  }
  const websiteHost = exhibitorWebsiteHost(trimmed);
  if (websiteHost && !index.careersHostToName.has(websiteHost)) {
    index.careersHostToName.set(websiteHost, trimmed);
  }
  return true;
}

function exhibitorWebsiteHost(exhibitorName: string): string | null {
  const row = loadSemiconKorea2026Exhibitors().find(
    (item) => item.companyName.trim() === exhibitorName.trim(),
  );
  return careersUrlHostKey(row?.websiteUrl);
}

/** SEMICON 참가사명이 이미 마스터·동일 사업자·동일 채용/홈페이지 사이트에 있으면 건너뜁니다. */
export function shouldSkipSemiconExhibitorForSemiSeed(
  exhibitorName: string,
  masterNames: readonly string[],
  index: SemiSeedNameIndex,
  targetByNorm: Map<string, TargetMeta>,
): boolean {
  const trimmed = exhibitorName.trim();
  if (!trimmed) return true;

  for (const master of masterNames) {
    if (companyLabelsMatch(master, trimmed)) return true;
  }

  const norm = semiEquipmentSeedNormalizeKey(trimmed);
  if (!norm || index.normKeys.has(norm)) return true;

  const meta = targetMetaForName(trimmed, targetByNorm);
  if (meta.businessNumberDigits) {
    const owner = index.businessNumberToName.get(meta.businessNumberDigits);
    if (owner && !companyLabelsMatch(owner, trimmed)) return true;
  }

  const careersHost = careersUrlHostKey(meta.careersUrl);
  if (careersHost) {
    const owner = index.careersHostToName.get(careersHost);
    if (owner && !companyLabelsMatch(owner, trimmed)) return true;
  }

  const websiteHost = exhibitorWebsiteHost(trimmed);
  if (websiteHost && index.careersHostToName.has(websiteHost)) return true;

  return false;
}

export function loadSemiTargetMetaByNormKey(): Map<string, TargetMeta> {
  return loadSemiTargetMetaByNorm();
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { semiEquipmentSeedNormalizeKey } from '@/lib/semi-display-equipment/master-seed';
import {
  createSemiSeedNameIndex,
  loadSemiTargetMetaByNormKey,
  registerSemiSeedCompanyName,
  shouldSkipSemiconExhibitorForSemiSeed,
} from '@/lib/semi-display-equipment/semi-seed-name-dedupe';

const DATA_PATH = resolve(process.cwd(), 'data/semicon-korea-2026-exhibitors.json');

export const SEMICON_KOREA_2026_EXHIBITORS_SOURCE_URL =
  'https://expo.semi.org/korea2026/Public/exhibitors.aspx?ID=31093&sortMenu=102001';

export type SemiconExhibitorRecord = {
  companyName: string;
  booth: string;
  boothId?: string;
  websiteUrl?: string | null;
  websiteCheckedAt?: string | null;
};

type SemiconExhibitorsFile = {
  version: 1;
  exhibitors?: SemiconExhibitorRecord[];
};

let cachedFile: SemiconExhibitorsFile | null = null;
let cachedNames: string[] | null = null;

function loadFile(): SemiconExhibitorsFile | null {
  if (cachedFile) return cachedFile;
  try {
    const raw = JSON.parse(readFileSync(DATA_PATH, 'utf8')) as SemiconExhibitorsFile;
    if (raw?.version !== 1 || !Array.isArray(raw.exhibitors)) return null;
    cachedFile = raw;
    return raw;
  } catch {
    return null;
  }
}

export function loadSemiconKorea2026Exhibitors(): SemiconExhibitorRecord[] {
  const file = loadFile();
  return file?.exhibitors ?? [];
}

export function loadSemiconKorea2026ExhibitorCompanyNames(): string[] {
  if (cachedNames) return cachedNames;
  const names = loadSemiconKorea2026Exhibitors()
    .map((row) => row.companyName?.trim())
    .filter((name): name is string => Boolean(name && name.length >= 2));
  cachedNames = [...new Set(names)];
  return cachedNames;
}

export function semiconExhibitorNormalizeKey(companyName: string): string {
  return semiEquipmentSeedNormalizeKey(companyName);
}

const websiteByNorm = new Map<string, string>();

function indexWebsites(): void {
  if (websiteByNorm.size > 0) return;
  for (const row of loadSemiconKorea2026Exhibitors()) {
    const url = row.websiteUrl?.trim();
    if (!url) continue;
    const key = semiconExhibitorNormalizeKey(row.companyName);
    if (key) websiteByNorm.set(key, url);
  }
}

/** SEMICON eBooth에서 확인한 공식 홈페이지 (채용 URL 탐색 힌트) */
export function getSemiconWebsiteForSeedCompany(companyName: string): string | null {
  indexWebsites();
  const key = semiconExhibitorNormalizeKey(companyName);
  if (!key) return null;
  return websiteByNorm.get(key) ?? null;
}

/** 마스터 시드 + SEMICON 참가사 — 한글 마스터·사업자번호·채용 URL 호스트로 중복 제거 */
export function mergeSemiDisplayCompanySeedNames(masterNames: readonly string[]): string[] {
  const targetByNorm = loadSemiTargetMetaByNormKey();
  const index = createSemiSeedNameIndex();
  const out: string[] = [];

  for (const name of masterNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (registerSemiSeedCompanyName(trimmed, index, targetByNorm)) {
      out.push(trimmed);
    }
  }

  for (const name of loadSemiconKorea2026ExhibitorCompanyNames()) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (shouldSkipSemiconExhibitorForSemiSeed(trimmed, masterNames, index, targetByNorm)) continue;
    if (registerSemiSeedCompanyName(trimmed, index, targetByNorm)) {
      out.push(trimmed);
    }
  }

  return out;
}

export function clearSemiconExhibitorsCache(): void {
  cachedFile = null;
  cachedNames = null;
  websiteByNorm.clear();
}

export const semiconExhibitorsDataPath = DATA_PATH;

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MID_SIZED_REGISTRY_SOURCE } from '@/lib/mid-sized-companies/registry-meta';
import type { MidSizedCompanyRecord, MidSizedRegistryFile } from '@/lib/mid-sized-companies/types';

const REGISTRY_PATH = resolve(process.cwd(), 'data/mid-sized-companies.json');

function parseRegistryFile(raw: unknown): MidSizedRegistryFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const file = raw as Partial<MidSizedRegistryFile>;
  if (file.version !== 1 || !Array.isArray(file.companies)) return null;
  return {
    version: 1,
    source: 'mme',
    sourceNote: typeof file.sourceNote === 'string' ? file.sourceNote : MID_SIZED_REGISTRY_SOURCE.note,
    importedAt: typeof file.importedAt === 'string' ? file.importedAt : '',
    companies: file.companies.filter((item): item is MidSizedCompanyRecord => {
      return Boolean(item && typeof item.companyName === 'string' && typeof item.businessNumber === 'string');
    }),
  };
}

/** 마당 명단 JSON (firebase-admin 없음 — registry-db·스크립트용) */
export function loadMidSizedRegistryFromDisk(): MidSizedRegistryFile {
  try {
    const text = readFileSync(REGISTRY_PATH, 'utf8');
    const parsed = parseRegistryFile(JSON.parse(text));
    if (parsed) return parsed;
  } catch {
    // 로컬 파일이 없으면 빈 목록입니다.
  }
  return {
    version: 1,
    source: 'mme',
    sourceNote: MID_SIZED_REGISTRY_SOURCE.note,
    importedAt: '',
    companies: [],
  };
}

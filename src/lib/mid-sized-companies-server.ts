import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { MID_SIZED_REGISTRY_SOURCE } from '@/lib/mid-sized-companies/registry-meta';
import { dedupeMidSizedCompanies, isMidSizedCertificateActive } from '@/lib/mid-sized-companies/registry-dedupe';
import type { MidSizedCompanyRecord, MidSizedRegistryFile } from '@/lib/mid-sized-companies/types';

const COLLECTION = 'midSizedCompanies';
const REGISTRY_PATH = resolve(process.cwd(), 'data/mid-sized-companies.json');

function normalizeBusinessNumber(value: string): string {
  return value.replace(/\D/g, '');
}

function docIdFor(record: Pick<MidSizedCompanyRecord, 'businessNumber' | 'companyName'>): string {
  const digits = normalizeBusinessNumber(record.businessNumber);
  if (digits) return digits;
  return `name-${record.companyName}`.replace(/\s+/g, '-').slice(0, 120);
}

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

export type MidSizedRegistryStats = {
  /** Firestore 문서 수(고유 기업 + _meta) */
  total: number;
  uniqueCompanyCount: number;
  rawRowCount: number;
  activeCertificateCount: number;
  careersUrlLinkedCount: number;
  importedAt: string | null;
  sourceNote: string;
  firestoreReady: boolean;
};

export async function getMidSizedRegistryStats(): Promise<MidSizedRegistryStats> {
  const disk = loadMidSizedRegistryFromDisk();
  const db = getAdminFirestore();
  const unique = dedupeMidSizedCompanies(disk.companies);
  const fallbackUnique = unique.length;
  const fallbackActive = unique.filter((item) => isMidSizedCertificateActive(item.validTo)).length;

  if (!db) {
    return {
      total: fallbackUnique + 1,
      uniqueCompanyCount: fallbackUnique,
      rawRowCount: disk.companies.length,
      activeCertificateCount: fallbackActive,
      careersUrlLinkedCount: unique.filter((item) => item.careersUrl).length,
      importedAt: disk.importedAt || null,
      sourceNote: disk.sourceNote,
      firestoreReady: false,
    };
  }

  try {
    const snap = await db.collection(COLLECTION).count().get();
    const total = snap.data().count;
    const meta = await db.collection(COLLECTION).doc('_meta').get();
    const metaData = meta.exists ? meta.data() : undefined;
    const importedAt =
      metaData && typeof metaData.importedAt === 'string' ? (metaData.importedAt as string) : disk.importedAt || null;
    return {
      total,
      uniqueCompanyCount:
        typeof metaData?.uniqueCompanyCount === 'number' ? metaData.uniqueCompanyCount : Math.max(0, total - 1),
      rawRowCount: typeof metaData?.rawRowCount === 'number' ? metaData.rawRowCount : disk.companies.length,
      activeCertificateCount:
        typeof metaData?.activeCertificateCount === 'number' ? metaData.activeCertificateCount : fallbackActive,
      careersUrlLinkedCount:
        typeof metaData?.careersUrlLinkedCount === 'number'
          ? metaData.careersUrlLinkedCount
          : unique.filter((item) => item.careersUrl).length,
      importedAt,
      sourceNote: MID_SIZED_REGISTRY_SOURCE.note,
      firestoreReady: true,
    };
  } catch {
    return {
      total: fallbackUnique + 1,
      uniqueCompanyCount: fallbackUnique,
      rawRowCount: disk.companies.length,
      activeCertificateCount: fallbackActive,
      careersUrlLinkedCount: unique.filter((item) => item.careersUrl).length,
      importedAt: disk.importedAt || null,
      sourceNote: disk.sourceNote,
      firestoreReady: false,
    };
  }
}

export type MidSizedRegistryImportMeta = {
  rawRowCount: number;
  uniqueCompanyCount: number;
  activeCertificateCount: number;
  careersUrlLinkedCount: number;
  careersUrlOfficialCount?: number;
};

export async function importMidSizedCompaniesToFirestore(
  companies: MidSizedCompanyRecord[],
  importedAt: string,
  meta?: MidSizedRegistryImportMeta,
): Promise<{ written: number }> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const batchSize = 400;
  let written = 0;

  for (let offset = 0; offset < companies.length; offset += batchSize) {
    const batch = db.batch();
    const slice = companies.slice(offset, offset + batchSize);
    for (const record of slice) {
      const id = docIdFor(record);
      batch.set(
        db.collection(COLLECTION).doc(id),
        {
          ...record,
          businessNumber: normalizeBusinessNumber(record.businessNumber),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      written += 1;
    }
    await batch.commit();
  }

  await db.collection(COLLECTION).doc('_meta').set(
    {
      importedAt,
      source: MID_SIZED_REGISTRY_SOURCE.name,
      sourceUrl: MID_SIZED_REGISTRY_SOURCE.url,
      count: companies.length,
      rawRowCount: meta?.rawRowCount ?? null,
      uniqueCompanyCount: meta?.uniqueCompanyCount ?? companies.length,
      activeCertificateCount: meta?.activeCertificateCount ?? null,
      careersUrlLinkedCount: meta?.careersUrlLinkedCount ?? null,
      careersUrlOfficialCount: meta?.careersUrlOfficialCount ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { written };
}

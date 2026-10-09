import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { MID_SIZED_REGISTRY_SOURCE } from '@/lib/mid-sized-companies/registry-meta';
import { loadMidSizedRegistryFromDisk } from '@/lib/mid-sized-companies/registry-mme-disk';
import { dedupeMidSizedCompanies, isMidSizedCertificateActive } from '@/lib/mid-sized-companies/registry-dedupe';
import type { MidSizedCompanyRecord } from '@/lib/mid-sized-companies/types';

const COLLECTION = 'midSizedCompanies';

export { loadMidSizedRegistryFromDisk };

function normalizeBusinessNumber(value: string): string {
  return value.replace(/\D/g, '');
}

function docIdFor(record: Pick<MidSizedCompanyRecord, 'businessNumber' | 'companyName'>): string {
  const digits = normalizeBusinessNumber(record.businessNumber);
  if (digits) return digits;
  return `name-${record.companyName}`.replace(/\s+/g, '-').slice(0, 120);
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

/**
 * 중견기업 DB 파일 생성 + Firestore 반영 (대기업 careers-urls와 같이 URL을 DB에 저장)
 * pnpm reconcile:mid-sized
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMidSizedRegistryDbFile,
  saveMidSizedRegistryDbToDisk,
} from '@/lib/mid-sized-companies/registry-db';
import { isMidSizedCertificateActive } from '@/lib/mid-sized-companies/registry-dedupe';
import { importMidSizedCompaniesToFirestore, loadMidSizedRegistryFromDisk } from '@/lib/mid-sized-companies-server';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvLocal();
  const registry = loadMidSizedRegistryFromDisk();
  const dbFile = buildMidSizedRegistryDbFile();
  saveMidSizedRegistryDbToDisk(dbFile);

  const importedAt = registry.importedAt || dbFile.updatedAt;
  const { written } = await importMidSizedCompaniesToFirestore(dbFile.companies, importedAt, {
    rawRowCount: registry.companies.length,
    uniqueCompanyCount: dbFile.uniqueCompanyCount,
    activeCertificateCount: dbFile.companies.filter((item) => isMidSizedCertificateActive(item.validTo)).length,
    careersUrlLinkedCount: dbFile.careersUrlLinkedCount,
    careersUrlOfficialCount: dbFile.careersUrlOfficialCount ?? dbFile.careersUrlLinkedCount,
  });

  const active = dbFile.companies.filter((item) => isMidSizedCertificateActive(item.validTo)).length;

  const official = dbFile.careersUrlOfficialCount ?? dbFile.careersUrlLinkedCount;
  console.log(
    `저장: data/mid-sized-registry-db.json (${dbFile.uniqueCompanyCount}곳, URL ${dbFile.careersUrlLinkedCount}곳 · 공식 사이트 ${official}곳)`,
  );
  console.log(`고유 중견기업 ${dbFile.uniqueCompanyCount}건 (마당 원본 ${registry.companies.length}행)`);
  console.log(`유효 인증 ${active}건 · 채용 URL 연결 ${dbFile.careersUrlLinkedCount}건`);
  console.log(`Firestore midSizedCompanies ${written}건 반영 (각 문서에 careersUrl 필드 포함)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

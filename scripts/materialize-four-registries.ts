/**
 * 4개 명단 DB(대기업·중견·IT·반도체) 디스크 파일을 최신 빌드로 맞추고 커버리지를 출력합니다.
 * pnpm materialize:registries
 */
import { digitsOnly } from '@/lib/business-number';
import {
  buildEnterpriseRegistryDbFile,
  saveEnterpriseRegistryDbToDisk,
} from '@/lib/enterprise-companies/registry-db';
import {
  buildMidSizedRegistryDbFile,
  saveMidSizedRegistryDbToDisk,
} from '@/lib/mid-sized-companies/registry-db';
import { loadSeedCareersRegistryDbCompanies } from '@/lib/seed-careers/registry-db';
import { spawnSync } from 'node:child_process';

function hasBn(value: string | null | undefined): boolean {
  return digitsOnly(value ?? '').length === 10;
}

function report(label: string, rows: { businessNumber?: string | null; careersUrl?: string | null }[]): void {
  const n = rows.length;
  const bn = rows.filter((r) => hasBn(r.businessNumber)).length;
  const url = rows.filter((r) => r.careersUrl?.trim()).length;
  console.log(`${label}: ${n}곳 · 사업자번호 ${bn}곳 · 채용 URL ${url}곳`);
}

function main(): void {
  const enterprise = buildEnterpriseRegistryDbFile();
  saveEnterpriseRegistryDbToDisk(enterprise);
  report(
    '대기업',
    enterprise.companies.map((r) => ({ careersUrl: r.careersUrl })),
  );

  const midSized = buildMidSizedRegistryDbFile();
  saveMidSizedRegistryDbToDisk(midSized);
  report('중견기업', midSized.companies);

  const sync = spawnSync('pnpm', ['sync:seed-registry'], { stdio: 'inherit', shell: true });
  if (sync.status !== 0) process.exit(sync.status ?? 1);

  report('IT 회사', loadSeedCareersRegistryDbCompanies('it'));
  report('반도체·디스플레이 장비사', loadSeedCareersRegistryDbCompanies('semi-equipment'));
}

main();

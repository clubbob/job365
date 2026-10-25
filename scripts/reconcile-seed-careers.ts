/**
 * IT·반도체 장비 시드 채용 URL DB 파일 생성
 * pnpm reconcile:seed-careers
 */
import {
  buildSeedCareersRegistryDbFile,
  saveSeedCareersRegistryDbToDisk,
} from '@/lib/seed-careers/registry-db';
import { parseSeedCareersSegment, SEED_CAREERS_SEGMENTS, type SeedCareersSegment } from '@/lib/seed-careers/segment';

async function main(): Promise<void> {
  const segmentArg = parseSeedCareersSegment(process.env.SEGMENT) ?? 'all';
  const segments: SeedCareersSegment[] =
    segmentArg === 'all' ? [...SEED_CAREERS_SEGMENTS] : [segmentArg];

  for (const segment of segments) {
    const dbFile = buildSeedCareersRegistryDbFile(segment);
    saveSeedCareersRegistryDbToDisk(segment, dbFile);
    const label = segment === 'it' ? 'IT 시드' : '반도체·디스플레이 장비 시드';
    console.log(
      `저장: data/${segment === 'it' ? 'it-seed' : 'semi-seed'}-registry-db.json — ${label} ${dbFile.uniqueCompanyCount}곳 · 채용 URL ${dbFile.careersUrlLinkedCount}곳`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

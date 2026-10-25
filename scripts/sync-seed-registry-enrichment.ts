/**
 * 시드 명단 — 수동 보정·중견 명단 연결 → crawl-targets + registry-db 갱신
 * pnpm sync:seed-registry
 */
import { writeFileSync } from 'node:fs';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { findMidSizedBridgeForSeedCompany } from '@/lib/seed-careers/mid-sized-bridge';
import { listSeedCareersCompanyNames } from '@/lib/seed-careers/company-names';
import { seedCareersCrawlSourceId } from '@/lib/seed-careers/crawl-source-id';
import {
  buildSeedCareersRegistryDbFile,
  saveSeedCareersRegistryDbToDisk,
} from '@/lib/seed-careers/registry-db';
import { loadSeedCareersCrawlTargets } from '@/lib/seed-careers/crawl-targets';
import { loadSeedCareersRegistryOverrides } from '@/lib/seed-careers/registry-overrides';
import { seedCareersTargetsPath } from '@/lib/seed-careers/paths';
import { parseSeedCareersSegment, SEED_CAREERS_SEGMENTS, type SeedCareersSegment } from '@/lib/seed-careers/segment';
import type { SeedCareersTarget } from '@/lib/seed-careers/types';

function syncSegment(segment: SeedCareersSegment): void {
  const names = listSeedCareersCompanyNames(segment);
  const overrides = loadSeedCareersRegistryOverrides(segment);
  const byName = new Map<string, SeedCareersTarget>();
  for (const item of loadSeedCareersCrawlTargets(segment)) {
    byName.set(item.name.trim(), item);
  }

  let fromOverride = 0;
  let fromMidSized = 0;
  let keptExisting = 0;

  for (const seedName of names) {
    const key = seedName.trim();
    const override = overrides.get(key);
    const bridge = findMidSizedBridgeForSeedCompany(segment, seedName);
    const existing = byName.get(key);

    const careersUrl = (override?.careersUrl ?? bridge?.careersUrl ?? existing?.careersUrl ?? '').trim();
    if (!careersUrl) continue;

    const businessNumber =
      override?.businessNumber ?? bridge?.businessNumber ?? existing?.businessNumber ?? null;
    const crawlSourceId =
      bridge?.careersUrl === careersUrl && bridge.crawlSourceId
        ? bridge.crawlSourceId
        : existing?.crawlSourceId ?? seedCareersCrawlSourceId(segment, seedName);

    byName.set(key, {
      name: seedName,
      crawlSourceId,
      careersUrl,
      businessNumber,
      adapter: existing?.adapter,
      greenhouseBoard: existing?.greenhouseBoard,
    });

    if (override?.careersUrl) fromOverride += 1;
    else if (bridge?.careersUrl) fromMidSized += 1;
    else keptExisting += 1;
  }

  const targets = [...byName.values()];

  const targetsPath = seedCareersTargetsPath(segment);
  writeFileSync(
    targetsPath,
    stringifyJsonSafe({
      version: 1,
      generatedAt: new Date().toISOString(),
      segment,
      targets,
    }),
    'utf8',
  );

  const dbFile = buildSeedCareersRegistryDbFile(segment);
  saveSeedCareersRegistryDbToDisk(segment, dbFile);

  const label = segment === 'it' ? 'IT 시드' : '반도체·디스플레이 장비 시드';
  console.log(
    `${label}: crawl-targets ${targets.length}곳 (보정 ${fromOverride} · 중견 이관 ${fromMidSized} · 기존 유지 ${keptExisting}) → ${targetsPath}`,
  );
  console.log(
    `registry-db ${dbFile.uniqueCompanyCount}곳 · 채용 URL ${dbFile.careersUrlLinkedCount}곳 · 사업자번호 ${dbFile.companies.filter((r) => r.businessNumber).length}곳`,
  );
}

function main(): void {
  const segmentArg = parseSeedCareersSegment(process.env.SEGMENT) ?? 'all';
  const segments: SeedCareersSegment[] =
    segmentArg === 'all' ? [...SEED_CAREERS_SEGMENTS] : [segmentArg];

  for (const segment of segments) {
    syncSegment(segment);
  }
}

main();

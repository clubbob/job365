/**
 * 반도체·디스플레이 시드 crawl-targets 보정 — URL 정리·포털 제거·crawlSourceId 재부여 → sync
 * pnpm repair:semi-seed
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { isStorableCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';
import { normalizeStoredCareersUrl } from '@/lib/seed-careers/normalize-careers-url';
import { seedCareersCrawlSourceId } from '@/lib/seed-careers/crawl-source-id';
import { seedCareersTargetsPath } from '@/lib/seed-careers/paths';
import type { SeedCareersTarget } from '@/lib/seed-careers/types';

const SEGMENT = 'semi-equipment' as const;

function main(): void {
  const path = seedCareersTargetsPath(SEGMENT);
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    version: number;
    targets: SeedCareersTarget[];
  };
  const before = raw.targets?.length ?? 0;
  let sanitized = 0;
  let droppedInvalid = 0;
  let fixedSourceId = 0;

  const targets: SeedCareersTarget[] = [];
  for (const item of raw.targets ?? []) {
    const normalized = normalizeStoredCareersUrl(item.careersUrl);
    if (normalized !== item.careersUrl?.trim()) sanitized += 1;
    if (!normalized || !isStorableCareersUrl(normalized)) {
      droppedInvalid += 1;
      continue;
    }
    const crawlSourceId = seedCareersCrawlSourceId(SEGMENT, item.name);
    if (item.crawlSourceId !== crawlSourceId) fixedSourceId += 1;
    targets.push({
      ...item,
      careersUrl: normalized,
      crawlSourceId,
    });
  }

  writeFileSync(
    path,
    stringifyJsonSafe({
      version: 1,
      generatedAt: new Date().toISOString(),
      segment: SEGMENT,
      targets,
    }),
    'utf8',
  );

  console.log(
    `반도체·디스플레이 crawl-targets: ${before}곳 → ${targets.length}곳 (URL 정리 ${sanitized} · 제거 ${droppedInvalid} · sourceId ${fixedSourceId})`,
  );

  const sync = spawnSync('pnpm', ['sync:seed-registry'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, SEGMENT: SEGMENT },
  });
  process.exit(sync.status ?? 0);
}

main();

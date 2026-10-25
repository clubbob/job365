/**
 * 오탐 채용 URL(멜론 검색 등) 제거 후 sync:seed-registry로 중견·보정 URL 복구
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import { isStorableCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';
import { seedCareersDiscoveryStatePath, seedCareersTargetsPath } from '@/lib/seed-careers/paths';
import { SEED_CAREERS_SEGMENTS, type SeedCareersSegment } from '@/lib/seed-careers/segment';
import type { SeedCareersDiscoveryEntry, SeedCareersTarget } from '@/lib/seed-careers/types';

function purgeSegment(segment: SeedCareersSegment): void {
  const targetsPath = seedCareersTargetsPath(segment);
  const discoveryPath = seedCareersDiscoveryStatePath(segment);
  let removedTargets = 0;
  let removedDiscovery = 0;

  try {
    const raw = JSON.parse(readFileSync(targetsPath, 'utf8')) as { targets: SeedCareersTarget[] };
    const kept = (raw.targets ?? []).filter((t) => {
      const ok = isStorableCareersUrl(t.careersUrl);
      if (!ok) removedTargets += 1;
      return ok;
    });
    writeFileSync(
      targetsPath,
      stringifyJsonSafe({ ...raw, generatedAt: new Date().toISOString(), targets: kept }),
      'utf8',
    );
  } catch {
    // no file
  }

  try {
    const raw = JSON.parse(readFileSync(discoveryPath, 'utf8')) as {
      entries: Record<string, SeedCareersDiscoveryEntry>;
    };
    const entries = { ...raw.entries };
    for (const [key, entry] of Object.entries(entries)) {
      if (entry.careersUrl && !isStorableCareersUrl(entry.careersUrl)) {
        delete entries[key];
        removedDiscovery += 1;
      }
    }
    writeFileSync(discoveryPath, stringifyJsonSafe({ ...raw, entries }), 'utf8');
  } catch {
    // no file
  }

  console.log(`[${segment}] 제거 targets ${removedTargets} · discovery ${removedDiscovery}`);
}

for (const segment of SEED_CAREERS_SEGMENTS) {
  purgeSegment(segment);
}

const sync = spawnSync('pnpm', ['sync:seed-registry'], { stdio: 'inherit', shell: true });
process.exit(sync.status ?? 0);

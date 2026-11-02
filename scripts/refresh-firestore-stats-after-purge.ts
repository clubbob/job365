/**
 * 포털 공고 삭제 등 대량 변경 후 관리자 통계·출처 집계 갱신.
 * pnpm exec tsx scripts/refresh-firestore-stats-after-purge.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  invalidateCrawledJobsListCache,
  refreshFirestoreStatsAfterCrawl,
} from '@/lib/crawled-jobs-server';

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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
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
  invalidateCrawledJobsListCache();
  await refreshFirestoreStatsAfterCrawl();
  console.info('[purge] Firestore 통계·출처 집계를 갱신했습니다.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * 반도체·디스플레이 회사 시드 DB만 공고 수집 (Firestore 저장)
 * pnpm crawl:semi
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCrawlPipeline } from '@/lib/crawler/run';

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
  process.env.CRAWL_SEMI_ONLY = '1';

  const summary = await runCrawlPipeline();

  for (const source of summary.sources) {
    const errorNote = source.errors.length > 0 ? ` (오류: ${source.errors.join('; ')})` : '';
    console.log(`${source.sourceName}: 저장 ${source.upserted}건, 마감 ${source.closed}건${errorNote}`);
  }

  console.log(`완료: 총 저장 ${summary.totalUpserted}건, 마감 ${summary.totalClosed}건`);
}

main().catch((error) => {
  console.error('[crawl:semi] fatal:', error);
  process.exit(1);
});

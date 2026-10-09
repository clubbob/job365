/**
 * 중견기업 채용 공고만 수집 (DB에 연결된 URL + 고용24).
 * 일상 자동 수집(GitHub Actions `pnpm crawl`)과 별도 — 수동·대량 테스트용.
 * pnpm crawl:mid-sized
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
  process.env.CRAWL_MID_SIZED_ONLY = '1';
  if (!process.env.CRAWL_MID_SIZED_DB_BATCH_SIZE) {
    process.env.CRAWL_MID_SIZED_DB_BATCH_SIZE = '10000';
  }
  if (!process.env.CRAWL_MID_SIZED_BATCH_SIZE) {
    process.env.CRAWL_MID_SIZED_BATCH_SIZE = '10000';
  }

  const summary = await runCrawlPipeline();

  for (const source of summary.sources) {
    const errorNote = source.errors.length > 0 ? ` (오류: ${source.errors.slice(0, 2).join('; ')})` : '';
    console.log(`${source.sourceName}: 저장 ${source.upserted}건, 마감 ${source.closed}건${errorNote}`);
  }

  console.log(`완료: 총 저장 ${summary.totalUpserted}건, 마감 ${summary.totalClosed}건`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

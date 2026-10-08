/**
 * 등록된 채용 사이트를 전부 수집해 Firestore에 저장합니다.
 * 사용: pnpm crawl
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCrawlPipeline } from '@/lib/crawler/run';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
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
}

async function main() {
  loadEnvLocal();

  const summary = await runCrawlPipeline();

  for (const source of summary.sources) {
    const errorNote = source.errors.length > 0 ? ` (오류: ${source.errors.join('; ')})` : '';
    console.log(`${source.sourceName}: 저장 ${source.upserted}건, 마감 ${source.closed}건${errorNote}`);
  }

  console.log(`완료: 총 저장 ${summary.totalUpserted}건, 마감 ${summary.totalClosed}건`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

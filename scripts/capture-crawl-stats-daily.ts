/**
 * 오늘 한국 일자로 통계 요약을 crawlStatsDaily에 한 번 저장합니다.
 * 사용: pnpm tsx scripts/capture-crawl-stats-daily.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { captureCrawlStatsDailyIfNeeded, getCrawlStatsDaily } from '@/lib/crawl-stats-daily-server';
import { getKoreaDateLocalToday } from '@/lib/datetime';

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
  const day = getKoreaDateLocalToday();
  const result = await captureCrawlStatsDailyIfNeeded('summary');
  const stored = await getCrawlStatsDaily(day);
  const active = stored?.summary.activeJobs;
  console.log(
    `${day}: ${result}` +
      (typeof active === 'number' ? ` · 노출 ${active.toLocaleString('ko-KR')}건` : ''),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

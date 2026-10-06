/**
 * 채용 사이트를 수집해 Firestore에 저장합니다.
 * 사용:
 *   node --import tsx scripts/sync-extracted-sources.mjs          # 전체 104개
 *   node --import tsx scripts/sync-extracted-sources.mjs --success # 요약에 성공한 소스만
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { closeBrowserCrawlSession } from '../src/lib/crawler/browser-page-crawl.ts';
import { getCompanyCrawlers } from '../src/lib/crawler/registry.ts';
import { listActiveJobIdsBySource, markCrawledJobsClosed, upsertCrawledJob } from '../src/lib/crawled-jobs-server.ts';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
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
}

const onlySuccessful = process.argv.includes('--success');
let entries = getCompanyCrawlers();

if (onlySuccessful) {
  const summaryPath = resolve(process.cwd(), 'tmp-crawl-extract-summary.json');
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const targetSourceIds = new Set(
    summary.allResults.filter((row) => row.fetched > 0).map((row) => row.sourceId),
  );
  entries = entries.filter((item) => targetSourceIds.has(item.company.sourceId));
}

loadEnvLocal();

console.log(`DB 저장 시작: ${entries.length}개 소스${onlySuccessful ? ' (추출 성공분만)' : ''}\n`);

let totalFetched = 0;
let totalUpserted = 0;
let totalClosed = 0;

for (const [index, { company, crawl }] of entries.entries()) {
  const label = `[${index + 1}/${entries.length}] ${company.name}`;
  try {
    const result = await crawl();
    await closeBrowserCrawlSession();

    let upserted = 0;
    for (const job of result.jobs) {
      const write = await upsertCrawledJob(job);
      if (write !== 'unchanged') upserted += 1;
    }

    const seen = new Set(result.jobs.map((job) => job.id));
    const stale = (await listActiveJobIdsBySource(company.sourceId)).filter((id) => !seen.has(id));
    const closed = await markCrawledJobsClosed(stale, new Date().toISOString());

    totalFetched += result.jobs.length;
    totalUpserted += upserted;
    totalClosed += closed;

    const errorNote = result.errors.length > 0 ? ` | ${result.errors[0]?.slice(0, 50)}` : '';
    console.log(`${label}: ${result.jobs.length}건, 저장 ${upserted}건, 마감 ${closed}건${errorNote}`);
  } catch (error) {
    await closeBrowserCrawlSession();
    console.log(`${label}: 실패 - ${error instanceof Error ? error.message : '알 수 없음'}`);
  }
}

console.log(`\n완료: 수집 ${totalFetched}건, 저장 ${totalUpserted}건, 마감 ${totalClosed}건`);

/**
 * 사용: node --import tsx scripts/recrawl-source.mjs nongshim-careers
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

const sourceId = process.argv[2];
if (!sourceId) throw new Error('sourceId required');

loadEnvLocal();
const entry = getCompanyCrawlers().find((item) => item.company.sourceId === sourceId);
if (!entry) throw new Error(`source not found: ${sourceId}`);

const result = await entry.crawl();
let upserted = 0;
for (const job of result.jobs) {
  const write = await upsertCrawledJob(job);
  if (write !== 'unchanged') upserted += 1;
  console.log(job.title);
}

const seen = new Set(result.jobs.map((job) => job.id));
const stale = (await listActiveJobIdsBySource(sourceId)).filter((id) => !seen.has(id));
const closed = await markCrawledJobsClosed(stale, new Date().toISOString());
console.log(`done: ${result.jobs.length}건, 저장 ${upserted}건, 마감 ${closed}건`);

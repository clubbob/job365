/**
 * 등록된 채용 사이트 전체를 실제로 조회해 공고 추출 결과를 요약합니다.
 * 사용: node --import tsx scripts/crawl-extract-all.mjs [--from=0] [--limit=102]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { closeBrowserCrawlSession } from '../src/lib/crawler/browser-page-crawl.ts';
import { getCompanyCrawlers } from '../src/lib/crawler/registry.ts';

const CONCURRENCY = 1;
const fromArg = Number(process.argv.find((arg) => arg.startsWith('--from='))?.split('=')[1] ?? 0);
const limitArg = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? 0);
const allCrawlers = getCompanyCrawlers();
const crawlers = allCrawlers.slice(fromArg, limitArg > 0 ? fromArg + limitArg : undefined);
const outPath = resolve(process.cwd(), 'tmp-crawl-extract-summary.json');

function buildSummary(results, startedAt) {
  const withJobs = results.filter((row) => row.fetched > 0);
  const withErrors = results.filter((row) => row.errors.length > 0);
  const totalJobs = results.reduce((sum, row) => sum + row.fetched, 0);

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    siteCount: results.length,
    sitesWithJobs: withJobs.length,
    sitesWithErrors: withErrors.length,
    totalJobsFetched: totalJobs,
    byAdapter: Object.groupBy(results, (row) => row.adapter),
    topSources: withJobs
      .sort((a, b) => b.fetched - a.fetched)
      .slice(0, 20)
      .map((row) => ({
        name: row.name,
        fetched: row.fetched,
        affiliates: row.sampleCompanies,
        samples: row.sampleTitles,
      })),
    emptySources: results
      .filter((row) => row.fetched === 0)
      .map((row) => ({ name: row.name, adapter: row.adapter, error: row.errors[0] ?? null })),
    allResults: results,
  };
}

function saveProgress(results, startedAt) {
  writeFileSync(outPath, JSON.stringify(buildSummary(results, startedAt), null, 2), 'utf8');
}

async function runOne({ company, crawl }) {
  const started = Date.now();
  try {
    const result = await crawl();
    await closeBrowserCrawlSession();
    return {
      id: company.id,
      name: company.name,
      adapter: company.adapter,
      sourceId: result.sourceId,
      fetched: result.jobs.length,
      errors: result.errors,
      sampleTitles: result.jobs.slice(0, 3).map((job) => job.title),
      sampleCompanies: [...new Set(result.jobs.map((job) => job.companyName))].slice(0, 5),
      ms: Date.now() - started,
    };
  } catch (error) {
    await closeBrowserCrawlSession();
    return {
      id: company.id,
      name: company.name,
      adapter: company.adapter,
      sourceId: company.sourceId,
      fetched: 0,
      errors: [error instanceof Error ? error.message : '수집 실패'],
      sampleTitles: [],
      sampleCompanies: [],
      ms: Date.now() - started,
    };
  }
}

async function runPool(items, limit) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await runOne(items[current]);
      const row = results[current];
      const status = row.fetched > 0 ? `${row.fetched}건` : row.errors[0]?.slice(0, 60) ?? '0건';
      console.log(`[${current + 1}/${items.length}] ${row.name}: ${status} (${Math.round(row.ms / 1000)}s)`);
      saveProgress(results.filter(Boolean), startedAt);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

const startedAt = new Date().toISOString();
console.log(
  `수집 시작: ${crawlers.length}개 사이트 (전체 ${allCrawlers.length}개 중 ${fromArg + 1}번째부터, 순차 ${CONCURRENCY}개)\n`,
);

const results = await runPool(crawlers, CONCURRENCY);
const summary = buildSummary(results, startedAt);
saveProgress(results, startedAt);

console.log('\n=== 요약 ===');
console.log(`사이트: ${summary.siteCount}개`);
console.log(`공고 추출 성공: ${summary.sitesWithJobs}개 사이트, 총 ${summary.totalJobsFetched}건`);
console.log(`오류/0건: ${summary.emptySources.length}개 사이트`);
console.log(`\n상위 10개:`);
for (const row of summary.topSources.slice(0, 10)) {
  console.log(`  ${row.name}: ${row.fetched}건`);
}
console.log(`\n전체 결과: ${outPath}`);

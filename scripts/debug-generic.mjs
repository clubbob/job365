/**
 * 범용 수집기 디버그: 후보·오류만 빠르게 확인합니다.
 * 사용: node --import tsx scripts/debug-generic.mjs <sourceId>
 */
import { getCrawlerCompanies } from '../src/lib/crawler/companies.ts';
import { crawlGenericHtmlCareers } from '../src/lib/crawler/adapters/generic-html.ts';
import { closeBrowserCrawlSession } from '../src/lib/crawler/browser-page-crawl.ts';

const sourceId = process.argv[2];
if (!sourceId) {
  console.error('usage: node --import tsx scripts/debug-generic.mjs <crawlSourceId>');
  process.exit(1);
}

const company = getCrawlerCompanies().find((row) => row.id === sourceId);
if (!company) {
  console.error(`unknown sourceId: ${sourceId}`);
  process.exit(1);
}

const result = await crawlGenericHtmlCareers({
  sourceId: company.sourceId,
  sourceName: company.sourceName,
  companyName: company.name,
  careersUrl: company.careersUrl,
});
await closeBrowserCrawlSession();

console.log('company', company.name, company.careersUrl);
console.log('jobs', result.jobs.length);
console.log('errors', result.errors);
for (const job of result.jobs.slice(0, 5)) {
  console.log('-', job.title, '|', job.companyName, '|', job.applyUrl.slice(0, 80));
}

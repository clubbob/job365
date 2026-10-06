import { crawlPageWithBrowser, closeBrowserCrawlSession } from '../src/lib/crawler/browser-page-crawl.ts';
import { getCrawlerCompanies } from '../src/lib/crawler/companies.ts';
import { isLikelyJobTitle } from '../src/lib/crawler/job-heuristics.ts';

const sourceId = process.argv[2];
const company = getCrawlerCompanies().find((row) => row.id === sourceId);
if (!company) throw new Error(`unknown ${sourceId}`);

const rendered = await crawlPageWithBrowser(company.careersUrl);
await closeBrowserCrawlSession();

console.log('html len', rendered.html.length);
console.log('json payloads', rendered.jsonPayloads.length);

for (const [i, payload] of rendered.jsonPayloads.entries()) {
  const text = JSON.stringify(payload).slice(0, 500);
  console.log(`payload ${i}`, text);
}

const titles = [];
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) return value.forEach(walk);
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string' && v.length >= 8 && isLikelyJobTitle(v)) titles.push(`${k}=${v}`);
    else walk(v);
  }
}
for (const payload of rendered.jsonPayloads) walk(payload);
console.log('likely titles in json', titles.slice(0, 10));

const linkMatches = [...rendered.html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)]
  .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, ' ').trim() }))
  .filter((m) => m.text.length >= 8)
  .slice(0, 15);
console.log('sample links', linkMatches);

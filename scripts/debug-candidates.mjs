/**
 * 채용 페이지 HTML에서 후보 추출만 확인합니다.
 */
import { BROWSER_HTML_HEADERS } from '../src/lib/crawler/browser-headers.ts';
import { crawlPageWithBrowser, closeBrowserCrawlSession } from '../src/lib/crawler/browser-page-crawl.ts';
import { discoverPageApis, discoverDetailUrlPrefix } from '../src/lib/crawler/discover-page-apis.ts';
import { extractCandidatesFromHtmlFragment } from '../src/lib/crawler/html-list-fragment.ts';
import { fetchRecruitListCandidates } from '../src/lib/crawler/json-list-api.ts';
import { getCrawlerCompanies } from '../src/lib/crawler/companies.ts';

const sourceId = process.argv[2];
const company = getCrawlerCompanies().find((row) => row.id === sourceId);
if (!company) throw new Error(`unknown ${sourceId}`);

const careersUrl = company.careersUrl;
const res = await fetch(careersUrl, { headers: BROWSER_HTML_HEADERS, signal: AbortSignal.timeout(30000) });
const html = await res.text();
const cookieHeader = (res.headers.getSetCookie?.() ?? []).map((item) => item.split(';')[0]).join('; ');

console.log('status', res.status, 'len', html.length);
console.log('apis', discoverPageApis(html).slice(0, 10));
console.log('detailPrefix', discoverDetailUrlPrefix(html));

const jsonCandidates = await fetchRecruitListCandidates(careersUrl, company.name);
console.log('jsonCandidates', jsonCandidates.length, jsonCandidates.slice(0, 3).map((c) => c.title));

const fragmentCandidates = extractCandidatesFromHtmlFragment(html, careersUrl, company.name, careersUrl);
console.log('fragmentCandidates', fragmentCandidates.length, fragmentCandidates.slice(0, 3).map((c) => c.title));

if (fragmentCandidates.length === 0 && jsonCandidates.length === 0) {
  console.log('trying browser...');
  const rendered = await crawlPageWithBrowser(careersUrl);
  await closeBrowserCrawlSession();
  console.log('browser html len', rendered.html.length, 'json payloads', rendered.jsonPayloads.length, 'fragments', rendered.htmlFragments.length);
  for (const frag of rendered.htmlFragments.slice(0, 2)) {
    const items = extractCandidatesFromHtmlFragment(frag.html, frag.url, company.name, careersUrl);
    console.log('frag', frag.url, 'items', items.length, items.slice(0, 2).map((c) => c.title));
  }
}

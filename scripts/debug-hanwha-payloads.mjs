import { crawlPageWithBrowser, closeBrowserCrawlSession } from '../src/lib/crawler/browser-page-crawl.ts';
import { crawlGenericHtmlCareers } from '../src/lib/crawler/adapters/generic-html.ts';

const url = 'https://www.hanwhain.com/web/apply/notification/main_list_iframe.do?rtSeq=&schTp=nrcrt';

const rendered = await crawlPageWithBrowser(url);
console.log('payloads', rendered.jsonPayloads.length);
for (let i = 0; i < rendered.jsonPayloads.length; i += 1) {
  const payload = rendered.jsonPayloads[i];
  console.log('--- payload', i, '---');
  console.log(JSON.stringify(payload).slice(0, 800));
}

const linkMatches = rendered.html.match(/href="[^"]+"/g) ?? [];
console.log('link sample', linkMatches.slice(0, 15));

const titleMatches = rendered.html.match(/class="[^"]*title[^"]*"[^>]*>[^<]{4,}/gi) ?? [];
console.log('title sample', titleMatches.slice(0, 10));

const result = await crawlGenericHtmlCareers({
  sourceId: 'hanwha-careers',
  sourceName: '한화 채용',
  companyName: '한화',
  careersUrl: url,
});
await closeBrowserCrawlSession();

console.log('crawl jobs', result.jobs.length);
console.log('errors', result.errors);

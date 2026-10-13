import { crawlPageWithBrowser } from '../src/lib/crawler/browser-page-crawl.ts';
import { discoverPageApis } from '../src/lib/crawler/discover-page-apis.ts';

const url = 'https://www.samsungcareers.com/hr/?search=';
const rendered = await crawlPageWithBrowser(url);
console.log('html', rendered.html.length, 'json payloads', rendered.jsonPayloads.length, 'fragments', rendered.htmlFragments.length);
console.log('apis', discoverPageApis(rendered.html).slice(0, 15));
if (rendered.jsonPayloads[0]) {
  console.log('payload0 keys', Object.keys(rendered.jsonPayloads[0] ?? {}).slice(0, 10));
  console.log(JSON.stringify(rendered.jsonPayloads[0]).slice(0, 600));
}

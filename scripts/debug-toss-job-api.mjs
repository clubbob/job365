import { chromium } from 'playwright';
import { BROWSER_USER_AGENT } from '../src/lib/crawler/browser-headers.ts';

const url = 'https://toss.im/career/job-detail?gh_jid=6576715003';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ userAgent: BROWSER_USER_AGENT });
const apis = [];
page.on('response', (response) => {
  const type = response.request().resourceType();
  if (type === 'xhr' || type === 'fetch') apis.push(response.url());
});
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
console.log('apis', apis.filter((u) => /toss|greenhouse|job|career/i.test(u)));
console.log('title', await page.title());
const text = await page.locator('main').innerText().catch(() => '');
console.log('main text len', text.length, text.slice(0, 300));
await browser.close();

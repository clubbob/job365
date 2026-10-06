import { chromium } from 'playwright';
import { BROWSER_USER_AGENT } from '../src/lib/crawler/browser-headers.ts';
import { getCrawlerCompanies } from '../src/lib/crawler/companies.ts';

const sourceId = process.argv[2];
const company = getCrawlerCompanies().find((row) => row.id === sourceId);
if (!company) throw new Error(`unknown ${sourceId}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ userAgent: BROWSER_USER_AGENT });
const urls = [];

page.on('response', (response) => {
  const type = response.request().resourceType();
  if (type === 'xhr' || type === 'fetch') {
    urls.push({ status: response.status(), url: response.url(), type });
  }
});

await page.goto(company.careersUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

for (const row of urls) {
  console.log(row.status, row.url.slice(0, 180));
}

await browser.close();

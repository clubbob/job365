import { getCrawlerCompanies } from '../src/lib/crawler/companies.ts';
import { BROWSER_HTML_HEADERS } from '../src/lib/crawler/browser-headers.ts';

const companies = getCrawlerCompanies();
const failed = [];

for (const company of companies) {
  try {
    const res = await fetch(company.careersUrl, {
      headers: BROWSER_HTML_HEADERS,
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (!res.ok) failed.push({ name: company.name, url: company.careersUrl, error: `HTTP ${res.status}` });
  } catch (error) {
    failed.push({
      name: company.name,
      url: company.careersUrl,
      error: error instanceof Error ? error.cause?.code ?? error.message : 'failed',
    });
  }
}

console.log('failed', failed.length, '/', companies.length);
for (const row of failed) console.log(row.name, row.error, row.url);

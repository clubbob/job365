import { fetchText } from '../src/lib/crawler/fetch-text.ts';
import { BROWSER_AJAX_HEADERS } from '../src/lib/crawler/browser-headers.ts';

const url = 'https://www.skcareers.com/Recruit';
const html = await fetchText(url, { headers: BROWSER_AJAX_HEADERS });
console.log('len', html.length);
const apis = [...html.matchAll(/["'](\/[^"']*(?:api|recruit|Recruit)[^"']*)["']/gi)]
  .map((m) => m[1])
  .filter((s) => s.length < 120);
console.log([...new Set(apis)].slice(0, 40).join('\n'));

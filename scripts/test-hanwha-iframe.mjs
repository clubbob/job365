import { BROWSER_HTML_HEADERS } from '../src/lib/crawler/browser-headers.ts';
import { extractCandidatesFromLinks } from '../src/lib/crawler/adapters/generic-html.ts';

const url = 'https://www.hanwhain.com/web/apply/notification/main_list_iframe.do?rtSeq=&schTp=nrcrt';
const res = await fetch(url, { headers: BROWSER_HTML_HEADERS });
const html = await res.text();
console.log('status', res.status, 'len', html.length);
console.log(html.slice(0, 500));

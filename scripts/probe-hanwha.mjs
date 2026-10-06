import { BROWSER_AJAX_HEADERS } from '../src/lib/crawler/browser-headers.ts';

const res = await fetch('https://hwadm.hanwhain.com/new-backend/portal/api/rcRecruit/get-rcrt', {
  method: 'POST',
  headers: {
    ...BROWSER_AJAX_HEADERS,
    Referer: 'https://www.hanwhain.com/portal/apply/recruit/detail?rtSeq=19827',
    Origin: 'https://www.hanwhain.com',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ rtSeq: 19827 }),
});
const json = await res.json();
console.log(JSON.stringify(json, null, 2).slice(0, 4000));

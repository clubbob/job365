import { BROWSER_AJAX_HEADERS } from '../src/lib/crawler/browser-headers.ts';

const first = await fetch('https://www.skcareers.com/Recruit', {
  headers: BROWSER_AJAX_HEADERS,
  signal: AbortSignal.timeout(20000),
});
const cookies = (first.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
const html = await first.text();
const tokenMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
const token = tokenMatch?.[1];
console.log('token', token ? 'yes' : 'no', 'cookies', cookies.slice(0, 80));

const body = new URLSearchParams({
  sort: '',
  searchText: '',
  corpCode: '',
  jobRole: '',
  recruitType: '',
  workingType: '',
  workingRegion: '',
});
if (token) body.set('__RequestVerificationToken', token);

const res = await fetch('https://www.skcareers.com/Recruit/GetRecruitList', {
  method: 'POST',
  headers: {
    ...BROWSER_AJAX_HEADERS,
    Referer: 'https://www.skcareers.com/Recruit',
    Cookie: cookies,
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
  },
  body,
  signal: AbortSignal.timeout(20000),
});
const text = await res.text();
console.log('status', res.status, text.slice(0, 300));

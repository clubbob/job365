import { BROWSER_HTML_HEADERS } from '../src/lib/crawler/browser-headers.ts';

const candidates = [
  ['gs', 'https://gsrecruit.gs.com'],
  ['gs2', 'https://recruit.gs.com'],
  ['doosan', 'https://careers.doosan.com'],
  ['doosan2', 'https://www.doosan.com/kr/careers'],
  ['nexon', 'https://career.nexon.com'],
  ['nexon2', 'https://recruit.nexon.com'],
  ['nonghyup', 'https://job.nonghyup.com'],
  ['nonghyup2', 'https://www.nonghyup.com/recruit'],
  ['shinsegae', 'https://job.shinsegae.com'],
  ['hanjin', 'https://www.hanjin.com/ko/careers'],
  ['celltrion', 'https://www.celltrion.com/ko/careers'],
  ['hd', 'https://recruit.hd.com'],
  ['hd2', 'https://hd.com/kr/careers'],
  ['cj', 'https://recruit.cj.net'],
  ['hybe', 'https://hybecorp.com/ko/careers'],
  ['orion', 'https://orionworld.com/ko/careers'],
  ['gm', 'https://careers.gm.com/locations/south-korea-jobs'],
  ['daangn', 'https://team.daangn.com'],
  ['toss', 'https://toss.im/career/jobs'],
  ['line', 'https://careers.linecorp.com'],
  ['posco', 'https://recruit.posco.com/H22A1010.html'],
  ['hanwha', 'https://www.hanwha.co.kr/careers.do'],
];

for (const [name, url] of candidates) {
  try {
    const res = await fetch(url, { headers: BROWSER_HTML_HEADERS, signal: AbortSignal.timeout(10000), redirect: 'follow' });
    const text = await res.text();
    console.log(name, res.status, text.length, url);
  } catch (error) {
    console.log(name, 'FAIL', error.cause?.code ?? error.message, url);
  }
}

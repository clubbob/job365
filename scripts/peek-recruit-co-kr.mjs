import { fetchText } from '../src/lib/crawler/fetch-text.ts';

const url = process.argv[2] ?? 'https://nonghyup.recruit.co.kr';
try {
  const html = await fetchText(url);
  console.log('len', html.length);
  const apiHits = [...html.matchAll(/\/api\/[a-zA-Z0-9/_-]+/g)].map((m) => m[0]);
  console.log('api', [...new Set(apiHits)].slice(0, 20).join('\n'));
} catch (error) {
  console.error('fetch failed', error instanceof Error ? error.message : error);
}

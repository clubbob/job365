/**
 * 중견 명단 JSON에서 cs.com(뉴스 사이트 오탐) 채용 URL 제거.
 * pnpm exec node scripts/clear-mid-sized-cs-com-careers-urls.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'data/mid-sized-registry-db.json');
const raw = readFileSync(path, 'utf8');
const data = JSON.parse(raw);
let cleared = 0;

for (const row of data.companies ?? []) {
  const url = String(row.careersUrl ?? '').trim();
  if (!/^(https?:\/\/)?(www\.)?cs\.com/i.test(url)) continue;
  row.careersUrl = null;
  row.careersDiscoveryStatus = 'not_found';
  cleared += 1;
}

writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`cs.com 채용 URL ${cleared.toLocaleString('ko-KR')}곳 제거`);

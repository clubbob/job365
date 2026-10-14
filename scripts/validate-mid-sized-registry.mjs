/**
 * data/mid-sized-companies.json 파싱·구조 검증 (CI·로컬 사전 점검)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'data/mid-sized-companies.json');

function main() {
  const text = readFileSync(path, 'utf8');
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`mid-sized-companies.json JSON 파싱 실패: ${message}`);
    process.exit(1);
  }
  if (raw?.version !== 1 || !Array.isArray(raw.companies)) {
    console.error('mid-sized-companies.json 형식이 올바르지 않습니다 (version 1, companies 배열 필요).');
    process.exit(1);
  }
  if (raw.companies.length < 1000) {
    console.error(`mid-sized-companies.json 회사 수가 비정상적으로 적습니다 (${raw.companies.length}건).`);
    process.exit(1);
  }
  assertLineLength(path, text);
  for (const relative of [
    'data/mid-sized-crawl-targets.json',
    'data/mid-sized-discovery-state.json',
    'data/mid-sized-registry-db.json',
  ]) {
    const filePath = resolve(process.cwd(), relative);
    assertLineLength(filePath, readFileSync(filePath, 'utf8'));
  }
  console.log(`OK: mid-sized-companies.json (${raw.companies.length}건, ${text.length} bytes)`);
}

/** 한 줄이 너무 길면 에디터가 그 줄을 열다 강제 종료된다. */
function assertLineLength(filePath, text) {
  let max = 0;
  for (const line of text.split('\n')) {
    if (line.length > max) max = line.length;
  }
  if (max > 20000) {
    console.error(`${filePath} 한 줄이 너무 깁니다 (${max}자). 줄 단위로 나눠 저장하세요.`);
    process.exit(1);
  }
}

main();

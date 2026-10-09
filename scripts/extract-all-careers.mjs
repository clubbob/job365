/**
 * 대기업·계열사 + 연결된 중견기업 채용 공고 전수 수집
 * 1) (선택) 중견 URL 탐색  2) Firestore 명단 동기화  3) 전체 크롤
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const skipDiscover = process.env.SKIP_DISCOVER === '1';

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function run(command, args, env = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`명령 실패: ${command} ${args.join(' ')}`);
  }
}

async function main() {
  loadEnvLocal();

  if (!skipDiscover) {
    console.log('중견기업 채용 URL 탐색(미연결 재시도·네이버 검색 포함)…');
    run('pnpm', ['discover:mid-sized:urls'], {
      DISCOVER_CONCURRENCY: process.env.DISCOVER_CONCURRENCY ?? '5',
    });
  } else {
    console.log('SKIP_DISCOVER=1 — URL 탐색 생략');
  }

  console.log('중견기업 DB·Firestore 채용 URL 동기화…');
  run('pnpm', ['reconcile:mid-sized']);

  console.log('대기업·계열사·중견(연결된 전체) 채용 공고 수집…');
  run('pnpm', ['crawl'], {
    CRAWL_MID_SIZED_BATCH_SIZE: process.env.CRAWL_MID_SIZED_BATCH_SIZE ?? '10000',
    CRAWL_MID_SIZED_DB_BATCH_SIZE: process.env.CRAWL_MID_SIZED_DB_BATCH_SIZE ?? '10000',
    CRAWLER_USE_SAMPLES: 'false',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * 중견기업 6,732곳 전수: URL 탐색 → DB 반영 → 채용 페이지·고용24 수집
 * WORK24_AUTH_KEY(.env.local)가 있으면 사업자번호별 고용24 공고까지 조회합니다.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

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

  if (process.env.SKIP_DISCOVER !== '1') {
    console.log('중견기업 채용 URL 전수 탐색(미연결·잘못된 URL 재탐색)…');
    run('pnpm', ['discover:mid-sized:urls'], {
      DISCOVER_CONCURRENCY: process.env.DISCOVER_CONCURRENCY ?? '8',
      DISCOVER_RETRY_NOT_FOUND: '1',
      DISCOVER_REPROBE_BAD: '1',
    });
  }

  console.log('중견기업 DB·Firestore 동기화…');
  run('pnpm', ['reconcile:mid-sized']);

  console.log('연결된 채용 사이트 + 고용24(인증키 있을 때) 수집…');
  run('pnpm', ['crawl'], {
    CRAWL_MID_SIZED_DB_BATCH_SIZE: process.env.CRAWL_MID_SIZED_DB_BATCH_SIZE ?? '10000',
    CRAWL_MID_SIZED_BATCH_SIZE: process.env.CRAWL_MID_SIZED_BATCH_SIZE ?? '10000',
    CRAWLER_USE_SAMPLES: 'false',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

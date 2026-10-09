/**
 * 중견 6,732곳 최대 확보: 미연결 URL 재탐색 → DB 반영 → 채용 수집
 * WORK24_AUTH_KEY 있으면 고용24 전수(사업자번호+목록 스캔) 포함
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

  run('pnpm', ['discover:mid-sized:urls'], {
    DISCOVER_ALL_MISSING: '1',
    DISCOVER_RETRY_NOT_FOUND: '1',
    DISCOVER_REPROBE_BAD: '1',
    DISCOVER_CONCURRENCY: process.env.DISCOVER_CONCURRENCY ?? '10',
    DISCOVER_AUTO_RECONCILE: '0',
  });

  run('pnpm', ['reconcile:mid-sized']);

  run('pnpm', ['crawl:mid-sized'], {
    CRAWL_MID_SIZED_DB_BATCH_SIZE: '10000',
    CRAWL_MID_SIZED_BATCH_SIZE: '10000',
    WORK24_FULL_SCAN: '1',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * 중견기업 채용 URL 미리 처리 (대기업 enterprise-careers-urls 와 같은 역할 → DB·Firestore)
 *
 * 1) 웹·ATS 탐색으로 careersUrl 수집
 * 2) registry DB + Firestore 반영
 *
 * SKIP_DISCOVER=1 이면 1단계 생략(이미 쌓인 targets만 반영)
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
    console.log('중견기업 채용 URL 미리 탐색(6,732곳 명단 기준)…');
    run('pnpm', ['maximize:mid-sized:urls'], {
      DISCOVER_CONCURRENCY: process.env.DISCOVER_CONCURRENCY ?? '8',
      DISCOVER_AUTO_RECONCILE: '0',
    });
  } else {
    console.log('SKIP_DISCOVER=1 — 탐색 생략, DB만 반영');
  }

  console.log('미리 처리 결과를 registry DB·Firestore에 저장…');
  run('pnpm', ['reconcile:mid-sized']);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

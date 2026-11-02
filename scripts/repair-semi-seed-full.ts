/**
 * 반도체·디스플레이 시드 전체 보정: targets 정리 → 채용 URL 재탐색 → 사업자번호 → sync
 * pnpm repair:semi-seed:full
 */
import { spawnSync } from 'node:child_process';

const SEGMENT = 'semi-equipment';

function run(label: string, script: string, extraEnv?: Record<string, string>): void {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync('pnpm', ['exec', 'tsx', script], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, SEGMENT, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('crawl-targets 정리', 'scripts/repair-semi-seed-targets.ts');
run('채용 URL 재탐색', 'scripts/discover-seed-careers.ts', { DISCOVER_ALL_MISSING: '1' });
run('사업자번호 보강', 'scripts/enrich-seed-business-numbers.ts');
run('registry 동기화', 'scripts/sync-seed-registry-enrichment.ts');

console.log('\n반도체·디스플레이 시드 보정 완료. pnpm crawl:semi 로 공고 추출을 실행하세요.\n');

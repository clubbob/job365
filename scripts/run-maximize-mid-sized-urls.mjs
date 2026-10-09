/**
 * 중견 6,732곳 URL 연결 최대화: 미연결·not_found 전부 재탐색 → registry DB 반영
 *
 * pnpm maximize:mid-sized:urls
 * 구간만: DISCOVER_OFFSET=0 DISCOVER_LIMIT=500 pnpm maximize:mid-sized:urls
 */
process.env.DISCOVER_ALL_MISSING = '1';
process.env.DISCOVER_RETRY_NOT_FOUND = '1';
if (process.env.DISCOVER_REPROBE_BAD == null) process.env.DISCOVER_REPROBE_BAD = '1';
if (!process.env.DISCOVER_CONCURRENCY) process.env.DISCOVER_CONCURRENCY = '6';
if (!process.env.DISCOVER_TIMEOUT_MS) process.env.DISCOVER_TIMEOUT_MS = '12000';

await import('./discover-mid-sized-careers.mjs');

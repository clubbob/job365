/**
 * 미연결 중견기업 채용 URL 재탐색 (네이버 검색 포함)
 */
process.env.DISCOVER_RETRY_NOT_FOUND = '1';
if (process.env.DISCOVER_REPROBE_BAD == null) process.env.DISCOVER_REPROBE_BAD = '1';
if (process.env.DISCOVER_ALL_MISSING == null) process.env.DISCOVER_ALL_MISSING = '1';
if (!process.env.DISCOVER_CONCURRENCY) process.env.DISCOVER_CONCURRENCY = '5';

await import('./discover-mid-sized-careers.mjs');

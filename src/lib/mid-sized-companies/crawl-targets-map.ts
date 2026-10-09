import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MidSizedCareersConfig } from '@/lib/mid-sized-companies/types';

const TARGETS_PATH = resolve(process.cwd(), 'data/mid-sized-crawl-targets.json');

export function loadCrawlTargetsByBusinessNumber(): Map<string, MidSizedCareersConfig> {
  const map = new Map<string, MidSizedCareersConfig>();
  try {
    const raw = JSON.parse(readFileSync(TARGETS_PATH, 'utf8')) as { targets?: MidSizedCareersConfig[] };
    for (const item of raw.targets ?? []) {
      const digits = item.businessNumber?.replace(/\D/g, '') ?? '';
      if (digits) map.set(digits, item);
    }
  } catch {
    // targets 파일이 없으면 빈 맵
  }
  return map;
}

export function countCrawlTargetsOnDisk(): number {
  return loadCrawlTargetsByBusinessNumber().size;
}

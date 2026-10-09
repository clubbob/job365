import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MidSizedCareersConfig } from '@/lib/mid-sized-companies/types';

const TARGETS_PATH = resolve(process.cwd(), 'data/mid-sized-crawl-targets.json');

type TargetsFile = {
  version: number;
  targets: MidSizedCareersConfig[];
};

/** 수동 보강 URL (자동 탐색 전에도 확실히 수집) */
const MANUAL_MID_SIZED_CAREERS: MidSizedCareersConfig[] = [
  { name: '스마일게이트', crawlSourceId: 'smilegate', careersUrl: 'https://careers.smilegate.com/' },
  { name: '무신사', crawlSourceId: 'musinsa', careersUrl: 'https://www.musinsa.com/careers' },
  { name: '컬리', crawlSourceId: 'kurly', careersUrl: 'https://kurly.careers' },
  { name: '야놀자', crawlSourceId: 'yanolja', careersUrl: 'https://careers.yanolja.com' },
  { name: '우아한형제들', crawlSourceId: 'woowahan', careersUrl: 'https://career.woowahan.com' },
  { name: '리디', crawlSourceId: 'ridi', careersUrl: 'https://ridi.career.greetinghr.com' },
  { name: '직방', crawlSourceId: 'zigbang', careersUrl: 'https://career.zigbang.com' },
];

function loadDiscoveredTargets(): MidSizedCareersConfig[] {
  try {
    const raw = JSON.parse(readFileSync(TARGETS_PATH, 'utf8')) as TargetsFile;
    if (!raw || !Array.isArray(raw.targets)) return [];
    return raw.targets.filter(
      (item) => item && typeof item.name === 'string' && typeof item.careersUrl === 'string' && item.careersUrl.trim(),
    );
  } catch {
    return [];
  }
}

/** 중견기업 채용 수집 대상(자동 탐색 + 수동 보강, crawlSourceId 기준 중복 제거) */
export function loadMidSizedCrawlTargets(): MidSizedCareersConfig[] {
  const map = new Map<string, MidSizedCareersConfig>();
  for (const item of [...loadDiscoveredTargets(), ...MANUAL_MID_SIZED_CAREERS]) {
    const crawlSourceId = item.crawlSourceId.trim();
    if (!crawlSourceId) continue;
    map.set(crawlSourceId, { ...item, crawlSourceId, careersUrl: item.careersUrl.trim() });
  }
  return [...map.values()];
}

export function countMidSizedCrawlTargetsOnDisk(): number {
  return loadDiscoveredTargets().length;
}

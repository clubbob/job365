import { loadMidSizedCrawlTargets } from '@/lib/mid-sized-companies/crawl-targets';
import type { MidSizedCareersConfig } from '@/lib/mid-sized-companies/types';

/** @deprecated loadMidSizedCrawlTargets()를 사용하세요. */
export const MID_SIZED_CAREERS_CONFIGS: MidSizedCareersConfig[] = loadMidSizedCrawlTargets();

export { loadMidSizedCrawlTargets };

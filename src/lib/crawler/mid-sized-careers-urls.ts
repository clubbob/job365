import {
  dedupeRegistryRowsByBusinessNumberAndUrl,
  isCompleteRegistryCompanyIdentity,
} from '@/lib/registry-company-identity';
import { getUniqueMidSizedRegistryForCrawl } from '@/lib/mid-sized-companies/registry-for-crawl';
import { loadMidSizedRegistryDbFromDisk } from '@/lib/mid-sized-companies/registry-db';

/**
 * 중견기업 채용 URL 목록 (대기업 `enterprise-careers-urls.ts`와 동일 역할).
 *
 * - 마당(MME): 회사명·사업자번호 **명단만** 참조 (`data/mid-sized-companies.json`)
 * - 채용 URL: `pnpm preprocess:mid-sized` 탐색 결과 → `data/mid-sized-registry-db.json` + Firestore
 */
export type MidSizedCareersUrlConfig = {
  name: string;
  crawlSourceId: string;
  careersUrl: string;
  businessNumber: string;
  adapter: 'generic' | 'greenhouse';
  greenhouseBoard: string | null;
};

/** DB에 쌓인 채용 URL만 반환합니다 (수집 가능 목록). */
export function getMidSizedCareersConfigs(): MidSizedCareersUrlConfig[] {
  const mapped = getUniqueMidSizedRegistryForCrawl()
    .filter((record) => isCompleteRegistryCompanyIdentity(record))
    .map((record) => ({
      name: record.companyName,
      crawlSourceId: record.crawlSourceId,
      careersUrl: record.careersUrl!.trim(),
      businessNumber: record.businessNumber,
      adapter: record.careersAdapter ?? 'generic',
      greenhouseBoard: record.greenhouseBoard ?? null,
    }));
  return dedupeRegistryRowsByBusinessNumberAndUrl(mapped).rows;
}

export function countMidSizedCareersConfigs(): number {
  const file = loadMidSizedRegistryDbFromDisk();
  if (typeof file?.careersUrlLinkedCount === 'number') return file.careersUrlLinkedCount;
  return getMidSizedCareersConfigs().length;
}

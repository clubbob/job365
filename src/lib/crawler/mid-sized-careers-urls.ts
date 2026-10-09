import { isStorableCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';
import { loadMidSizedRegistryDbCompanies } from '@/lib/mid-sized-companies/registry-db';

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
  return loadMidSizedRegistryDbCompanies()
    .filter((record) => record.careersUrl && isStorableCareersUrl(record.careersUrl))
    .map((record) => ({
      name: record.companyName,
      crawlSourceId: record.crawlSourceId,
      careersUrl: record.careersUrl!.trim(),
      businessNumber: record.businessNumber,
      adapter: record.careersAdapter ?? 'generic',
      greenhouseBoard: record.greenhouseBoard ?? null,
    }));
}

export function countMidSizedCareersConfigs(): number {
  return getMidSizedCareersConfigs().length;
}

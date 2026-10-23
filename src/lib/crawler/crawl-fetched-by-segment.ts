import { getCrawlerCompanies } from '@/lib/crawler/companies';
import type { CrawlRunSummary } from '@/lib/crawler/types';
import { IT_ENTERPRISE_CRAWL_SOURCE_IDS, isItComputingCompanyName } from '@/lib/it-companies/catalog';
import {
  emptyCompanySegmentCounts,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';

function crawlSourceKey(sourceId: string): string {
  return sourceId.trim().replace(/-careers$/i, '');
}

let crawlSourcePrimarySegment: Map<string, JobBoardCompanySegment> | null = null;

function getCrawlSourcePrimarySegmentMap(): Map<string, JobBoardCompanySegment> {
  if (crawlSourcePrimarySegment) return crawlSourcePrimarySegment;

  const map = new Map<string, JobBoardCompanySegment>();
  for (const company of getCrawlerCompanies()) {
    let segment: JobBoardCompanySegment;
    if (company.tier === 'enterprise') {
      segment = IT_ENTERPRISE_CRAWL_SOURCE_IDS.has(company.id) ? 'IT 회사' : '대기업·계열사';
    } else if (company.tier === 'extra') {
      segment = isItComputingCompanyName(company.name) ? 'IT 회사' : '중견 기업';
    } else {
      segment = '중견 기업';
    }
    map.set(company.sourceId, segment);
    map.set(crawlSourceKey(company.sourceId), segment);
  }

  crawlSourcePrimarySegment = map;
  return map;
}

function primaryCompanySegmentForCrawlSource(sourceId: string, sourceName: string): JobBoardCompanySegment {
  const key = sourceId.trim();
  const map = getCrawlSourcePrimarySegmentMap();
  const fromMap = map.get(key) ?? map.get(crawlSourceKey(key));
  if (fromMap) return fromMap;

  const label = sourceName.replace(/\s*채용\s*$/, '').trim();
  if (label && isItComputingCompanyName(label)) return 'IT 회사';
  if (IT_ENTERPRISE_CRAWL_SOURCE_IDS.has(crawlSourceKey(key))) return 'IT 회사';

  if (key.includes('mid-sized') || key.includes('work24-mid-sized')) return '중견 기업';
  if (key.endsWith('-careers')) return '대기업·계열사';
  return '중견 기업';
}

/** 저장된 run에 분류별 건수가 없을 때 소스별 fetched로 근사 */
export function countFetchedBySegmentFromRunSources(
  sources: CrawlRunSummary['sources'],
): Record<JobBoardCompanySegment, number> {
  const counts = emptyCompanySegmentCounts();
  for (const source of sources) {
    const n = source.fetched ?? 0;
    if (n <= 0) continue;
    counts[primaryCompanySegmentForCrawlSource(source.sourceId, source.sourceName)] += n;
  }
  return counts;
}

export function countClosedBySegmentFromRunSources(
  sources: CrawlRunSummary['sources'],
): Record<JobBoardCompanySegment, number> {
  const counts = emptyCompanySegmentCounts();
  for (const source of sources) {
    const n = source.closed ?? 0;
    if (n <= 0) continue;
    counts[primaryCompanySegmentForCrawlSource(source.sourceId, source.sourceName)] += n;
  }
  return counts;
}

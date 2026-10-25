import {
  emptyCompanySegmentCounts,
  JOB_BOARD_COMPANY_SEGMENTS,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';
import type { RecruitingRegistrySegmentCounts } from '@/lib/recruiting-employers/registry-count-format';

/** 관리자 통계 요약 표 — 채용 정보 회사 분류와 동일 */
export const ADMIN_CRAWL_STATS_SEGMENTS = JOB_BOARD_COMPANY_SEGMENTS;

export type AdminCrawlStatsSegment = JobBoardCompanySegment;

export const LAST_ADMIN_CRAWL_STATS_SEGMENT: AdminCrawlStatsSegment =
  ADMIN_CRAWL_STATS_SEGMENTS[ADMIN_CRAWL_STATS_SEGMENTS.length - 1];

export function emptyAdminCrawlStatsSegmentCounts(): Record<AdminCrawlStatsSegment, number> {
  return emptyCompanySegmentCounts();
}

export function sumAdminCrawlStatsSegmentCounts(
  counts: Record<AdminCrawlStatsSegment, number>,
): number {
  return JOB_BOARD_COMPANY_SEGMENTS.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
}

export function registryToAdminCrawlStatsCounts(
  registry: RecruitingRegistrySegmentCounts,
): Record<AdminCrawlStatsSegment, number> {
  const counts = emptyCompanySegmentCounts();
  counts['대기업'] = registry.enterprise;
  counts['중견기업'] = registry['mid-sized'];
  counts['IT 회사'] = registry.it;
  counts['반도체·디스플레이 장비사'] = registry['semi-equipment'];
  return counts;
}

export function jobBoardToAdminCrawlStatsCounts(
  jobCounts: Record<JobBoardCompanySegment, number>,
): Record<AdminCrawlStatsSegment, number> {
  const counts = emptyCompanySegmentCounts();
  for (const key of JOB_BOARD_COMPANY_SEGMENTS) {
    counts[key] = jobCounts[key] ?? 0;
  }
  return counts;
}

export function netAdminCrawlStatsCounts(
  fetched: Record<JobBoardCompanySegment, number>,
  closed: Record<JobBoardCompanySegment, number>,
): Record<AdminCrawlStatsSegment, number> {
  const out = emptyCompanySegmentCounts();
  for (const key of JOB_BOARD_COMPANY_SEGMENTS) {
    out[key] = (fetched[key] ?? 0) - (closed[key] ?? 0);
  }
  return out;
}

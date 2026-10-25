import {
  IT_ENTERPRISE_CRAWL_SOURCE_IDS,
  isItComputingCompanyName,
} from '@/lib/it-companies/catalog';
import { isSemiDisplayEquipmentCompanyName } from '@/lib/semi-display-equipment/catalog';
import { crawledJobRecruitingCompanyName } from '@/lib/job-display';
import type { CrawledJobListItem } from '@/types/crawled-job';

/** 채용 정보 회사 분류 — 공고·명단 통계 모두 1건당 하나만 해당 */
export const JOB_BOARD_COMPANY_SEGMENTS = [
  '대기업·계열사',
  '중견 기업',
  'IT 회사',
  '반도체·디스플레이 장비사',
] as const;
export type JobBoardCompanySegment = (typeof JOB_BOARD_COMPANY_SEGMENTS)[number];

const LEGACY_COMPANY_SEGMENT: Record<string, JobBoardCompanySegment> = {
  'IT 기업': 'IT 회사',
  중견기업: '중견 기업',
  '기타 기업': '중견 기업',
  '반도체·디스플레이 장비': '반도체·디스플레이 장비사',
};

export type CompanySegmentJobFields = Pick<CrawledJobListItem, 'companyName' | 'companySize' | 'title'> & {
  sourceId?: string;
};

function crawlSourceKey(sourceId: string): string {
  return sourceId.trim().replace(/-careers$/i, '');
}

/** 브라우저·API 공통 — 회사명 + 대기업 IT 수집 출처 (node:fs 없음) */
export function isItCompanyJob(
  job: Pick<CompanySegmentJobFields, 'companyName' | 'title'> & { sourceId?: string },
): boolean {
  const recruitingCompany = crawledJobRecruitingCompanyName(job) || job.companyName.trim();
  if (isItComputingCompanyName(recruitingCompany)) return true;
  const sourceId = job.sourceId?.trim();
  if (!sourceId) return false;
  return IT_ENTERPRISE_CRAWL_SOURCE_IDS.has(crawlSourceKey(sourceId));
}

/** 브라우저·API 공통 — 장비 시드·회사명 매칭 */
export function isSemiDisplayEquipmentJob(
  job: Pick<CompanySegmentJobFields, 'companyName' | 'title'> & { sourceId?: string },
): boolean {
  const recruitingCompany = crawledJobRecruitingCompanyName(job) || job.companyName.trim();
  return isSemiDisplayEquipmentCompanyName(recruitingCompany);
}

export function isJobBoardCompanySegment(value: string): value is JobBoardCompanySegment {
  if ((JOB_BOARD_COMPANY_SEGMENTS as readonly string[]).includes(value)) return true;
  return LEGACY_COMPANY_SEGMENT[value] !== undefined;
}

function normalizeCompanySegment(value: string): JobBoardCompanySegment | null {
  if ((JOB_BOARD_COMPANY_SEGMENTS as readonly string[]).includes(value)) {
    return value as JobBoardCompanySegment;
  }
  return LEGACY_COMPANY_SEGMENT[value] ?? null;
}

export function parseJobBoardCompanySegments(value: unknown): JobBoardCompanySegment[] {
  if (!Array.isArray(value)) return [];
  const out: JobBoardCompanySegment[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const segment = normalizeCompanySegment(item);
    if (!segment || out.includes(segment)) continue;
    out.push(segment);
  }
  return out;
}

/** 장비사 → IT → 대기업·계열사 → 그 외(중견 기업) */
export function primaryCompanySegmentForJob(job: CompanySegmentJobFields): JobBoardCompanySegment {
  if (isSemiDisplayEquipmentJob(job)) return '반도체·디스플레이 장비사';
  if (isItCompanyJob(job)) return 'IT 회사';
  if (job.companySize === '대기업') return '대기업·계열사';
  return '중견 기업';
}

export function companySegmentsForJob(job: CompanySegmentJobFields): JobBoardCompanySegment[] {
  return [primaryCompanySegmentForJob(job)];
}

/** 카드·요약용 — 필터 「회사 분류」와 같은 표기 */
export function jobBoardCompanySegmentLabel(job: CompanySegmentJobFields): string {
  return primaryCompanySegmentForJob(job);
}

export function emptyCompanySegmentCounts(): Record<JobBoardCompanySegment, number> {
  return {
    '대기업·계열사': 0,
    '중견 기업': 0,
    'IT 회사': 0,
    '반도체·디스플레이 장비사': 0,
  };
}

export function sumCompanySegmentCounts(counts: Record<JobBoardCompanySegment, number>): number {
  return JOB_BOARD_COMPANY_SEGMENTS.reduce((sum, segment) => sum + (counts[segment] ?? 0), 0);
}

export function countJobsByPrimaryCompanySegment<T extends CompanySegmentJobFields>(
  jobs: T[],
): Record<JobBoardCompanySegment, number> {
  const counts = emptyCompanySegmentCounts();
  for (const job of jobs) {
    counts[primaryCompanySegmentForJob(job)] += 1;
  }
  return counts;
}

export function formatCompanySegmentCountBreakdown(
  counts: Record<JobBoardCompanySegment, number>,
): string {
  return JOB_BOARD_COMPANY_SEGMENTS.map(
    (segment) => `${segment} (${counts[segment].toLocaleString('ko-KR')}건)`,
  ).join(', ');
}

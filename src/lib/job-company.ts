import { formatBusinessNumber } from '@/lib/business-number';
import { loadBizVerify, toJobCompanyInfo } from '@/lib/biz-verify-store';
import { formatKoreaDateWithWeekday } from '@/lib/datetime';
import { findMyJobPosting } from '@/lib/my-job-posts';
import type { JobCompanyInfo, JobPosting } from '@/types/job';

function pickText(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function resolveJobCompany(job: JobPosting, ownerId?: string): JobCompanyInfo {
  const liveId = ownerId || findMyJobPosting(job.id)?.userId;
  const live = toJobCompanyInfo(liveId ? loadBizVerify(liveId) : null);
  const snap = job.company;
  return {
    companyName: pickText(live?.companyName, snap?.companyName, job.companyName),
    businessNumber: pickText(live?.businessNumber, snap?.businessNumber, job.businessNumber),
    ceo: pickText(live?.ceo, snap?.ceo),
    address: pickText(live?.address, snap?.address),
    phone: pickText(live?.phone, snap?.phone),
    fax: pickText(live?.fax, snap?.fax),
    foundedOn: pickText(live?.foundedOn, snap?.foundedOn),
    employeeCount: pickText(live?.employeeCount, snap?.employeeCount),
    lastYearRevenue: pickText(live?.lastYearRevenue, snap?.lastYearRevenue),
    website: pickText(live?.website, snap?.website),
    intro: pickText(live?.intro, snap?.intro),
  };
}

export function jobCompanyEmployeeCountLabel(value?: string): string {
  const digits = value?.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `${Number(digits).toLocaleString('ko-KR')}명`;
}

export function jobCompanyRevenueLabel(value?: string): string {
  const digits = value?.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `${Number(digits).toLocaleString('ko-KR')}백만 원`;
}

export function jobCompanyFoundedLabel(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  return formatKoreaDateWithWeekday(trimmed);
}

export function jobCompanyWebsiteHref(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`;
  return undefined;
}

export function jobCompanyBusinessNumberLabel(value?: string): string {
  return value ? formatBusinessNumber(value) : '';
}

export function attachJobCompany(
  job: Omit<JobPosting, 'company'> & { company?: JobCompanyInfo },
  ownerId: string,
): JobPosting {
  const live = toJobCompanyInfo(loadBizVerify(ownerId));
  const company: JobCompanyInfo | undefined = live
    ? {
        ...live,
        companyName: job.companyName.trim() || live.companyName,
        businessNumber: job.businessNumber?.trim() || live.businessNumber,
      }
    : job.company;
  return { ...job, company };
}

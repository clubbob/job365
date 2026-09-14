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
    companyName: pickText(snap?.companyName, job.companyName, live?.companyName),
    businessNumber: pickText(snap?.businessNumber, job.businessNumber, live?.businessNumber),
    ceo: pickText(snap?.ceo, live?.ceo),
    address: pickText(snap?.address, live?.address),
    phone: pickText(snap?.phone, live?.phone),
    fax: pickText(snap?.fax, live?.fax),
    foundedOn: pickText(snap?.foundedOn, live?.foundedOn),
    employeeCount: pickText(snap?.employeeCount, live?.employeeCount),
    lastYearRevenue: pickText(snap?.lastYearRevenue, live?.lastYearRevenue),
    website: pickText(snap?.website, live?.website),
    intro: pickText(snap?.intro, live?.intro),
    registrantName: pickText(snap?.registrantName, live?.registrantName),
    registrantEmail: pickText(snap?.registrantEmail, live?.registrantEmail),
    registrantMobile: pickText(snap?.registrantMobile, live?.registrantMobile),
  };
}

export function jobCompanyMainItems(company: JobCompanyInfo): Array<{
  label: string;
  value?: string;
  href?: string;
}> {
  const website = company.website?.trim() || '';
  return [
    { label: '사업자등록번호', value: jobCompanyBusinessNumberLabel(company.businessNumber) },
    { label: '회사명', value: company.companyName },
    { label: '대표자명', value: company.ceo },
    { label: '전화번호', value: company.phone },
    { label: '팩스번호', value: company.fax },
    { label: '설립일', value: jobCompanyFoundedLabel(company.foundedOn) },
    { label: '직원 수', value: jobCompanyEmployeeCountLabel(company.employeeCount) },
    { label: '전년 매출액', value: jobCompanyRevenueLabel(company.lastYearRevenue) },
    { label: '사업장 주소', value: company.address },
    { label: '홈페이지', value: website, href: jobCompanyWebsiteHref(website) },
  ];
}

export function jobCompanyRegistrantItems(company: JobCompanyInfo): Array<{ label: string; value?: string }> {
  return [
    { label: '등록자 이름', value: company.registrantName },
    { label: '이메일', value: company.registrantEmail },
    { label: '핸드폰 번호', value: company.registrantMobile },
  ];
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
  const stored = job.company;
  const company: JobCompanyInfo | undefined = stored?.companyName?.trim()
    ? {
        ...live,
        ...stored,
        companyName: job.companyName.trim() || stored.companyName || live?.companyName,
        businessNumber: job.businessNumber?.trim() || stored.businessNumber || live?.businessNumber,
      }
    : live
      ? {
          ...live,
          companyName: job.companyName.trim() || live.companyName,
          businessNumber: job.businessNumber?.trim() || live.businessNumber,
        }
      : stored;
  return {
    ...job,
    companyName: company?.companyName?.trim() || job.companyName,
    businessNumber: company?.businessNumber || job.businessNumber,
    company,
  };
}

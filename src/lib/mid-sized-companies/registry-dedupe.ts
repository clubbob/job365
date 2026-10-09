import type { MidSizedCompanyRecord } from '@/lib/mid-sized-companies/types';

export function normalizeBusinessNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/** 마당 엑셀은 발급 이력이 여러 행입니다. 사업자번호당 가장 늦은 유효기간 1건을 씁니다. */
export function dedupeMidSizedCompanies(companies: MidSizedCompanyRecord[]): MidSizedCompanyRecord[] {
  const map = new Map<string, MidSizedCompanyRecord>();
  for (const company of companies) {
    const bn = normalizeBusinessNumber(company.businessNumber);
    if (!bn) continue;
    const prev = map.get(bn);
    if (!prev) {
      map.set(bn, company);
      continue;
    }
    const prevEnd = prev.validTo ? new Date(prev.validTo).getTime() : 0;
    const nextEnd = company.validTo ? new Date(company.validTo).getTime() : 0;
    if (nextEnd >= prevEnd) map.set(bn, company);
  }
  return [...map.values()];
}

export function isMidSizedCertificateActive(validTo: string | null): boolean {
  if (!validTo) return true;
  const end = new Date(validTo);
  if (Number.isNaN(end.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end >= today;
}

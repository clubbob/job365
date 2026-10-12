import { decodeHtmlEntities } from '@/lib/crawler/decode-html-text';

export function normalizeCompanyLabel(name: string): string {
  return decodeHtmlEntities(name)
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .trim()
    .toLowerCase();
}

/** 제목·블록에 적힌 (주)회사명 */
export function extractCompanyHintFromTitle(title: string): string | null {
  const decoded = decodeHtmlEntities(title);
  const match = decoded.match(/\(\s*주\s*\)\s*([가-힣A-Za-z0-9&.·]+)/);
  return match?.[1]?.trim() ?? null;
}

export function companyLabelsMatch(a: string, b: string): boolean {
  const left = normalizeCompanyLabel(a);
  const right = normalizeCompanyLabel(b);
  if (!left || !right) return true;
  if (left === right) return true;
  if (left.length >= 3 && right.includes(left)) return true;
  if (right.length >= 3 && left.includes(right)) return true;
  return false;
}

/** 포털 목록에서 다른 회사 공고가 명단 회사 source에 섞이지 않도록 합니다. */
export function jobMatchesExpectedCompany(
  expectedCompanyName: string,
  title: string,
  candidateCompanyName?: string,
): boolean {
  const expected = expectedCompanyName.trim();
  if (!expected) return true;

  if (candidateCompanyName && !companyLabelsMatch(expected, candidateCompanyName)) {
    return false;
  }

  const hint = extractCompanyHintFromTitle(title);
  if (hint && !companyLabelsMatch(expected, hint)) {
    return false;
  }

  const titleNorm = normalizeCompanyLabel(title);
  const expectedNorm = normalizeCompanyLabel(expected);
  if (expectedNorm.length >= 4 && titleNorm.length >= 8 && !titleNorm.includes(expectedNorm)) {
    if (hint) return false;
  }

  return true;
}

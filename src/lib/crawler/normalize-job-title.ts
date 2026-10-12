import { decodeHtmlEntities } from '@/lib/crawler/decode-html-text';

function cleanText(value: string): string {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 포털 목록에 붙는 말줄임·D-day 잔여 문구 */
function stripPortalListNoise(title: string): string {
  return title
    .replace(/\s*\.{2,}\s*(\d+\s*일\s*남음)?\s*$/u, '')
    .replace(/\s+\d+\s*일\s*남음\s*$/u, '')
    .trim();
}

/** 목록 링크에 붙은 회사명 중복 등을 정리합니다. */
export function normalizeJobTitle(raw: string): string {
  let title = stripPortalListNoise(cleanText(raw));
  const bracketMatch = title.match(/^(\[[^\]]+\][^[\n]{0,80}?채용\s*공고)/);
  if (bracketMatch) return bracketMatch[1].replace(/\s+/g, ' ').trim();

  // "농심태경 농심태경 하반기 ..." → "농심태경 하반기 ..."
  title = title.replace(/^(\S{2,20})\s+\1\s+/, '$1 ');

  /** Firestore·상세 화면용. 목록 카드는 CSS line-clamp로 줄입니다. */
  const maxLength = 220;
  if (title.length > maxLength) return title.slice(0, maxLength).trim();
  return title;
}

export function mergeCompanyAndTitle(companyName: string | undefined, title: string): string {
  const normalizedTitle = normalizeJobTitle(title);
  const company = companyName?.trim();
  if (!company) return normalizedTitle;
  if (normalizedTitle.startsWith(company)) return normalizedTitle;
  return normalizeJobTitle(`${company} ${normalizedTitle}`);
}

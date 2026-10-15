import { decodeHtmlEntities } from '@/lib/crawler/decode-html-text';

function cleanText(value: string): string {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 목록·카드에 붙는 D-day·마감 임박 배지 (제목 앞·뒤) */
export function stripJobTitleCountdownNoise(title: string): string {
  let t = title.trim();
  for (let i = 0; i < 4; i++) {
    const next = t
      .replace(/^(\d{1,3}\s*일\s*남음\s*)+(\d{1,3}\s*일\s*)?/u, '')
      .replace(/^남음\s+\d{1,3}\s*일\s+/u, '')
      .replace(/^D-\s*\d{1,3}\s+/iu, '')
      .replace(/^마감\s*\d{1,3}\s*일\s*전\s*/u, '')
      .replace(/^\d{1,3}\s+(?=\[)/u, '')
      .replace(/\s*\.{2,}\s*(\d+\s*일\s*남음)?\s*$/u, '')
      .replace(/\s+\d{1,3}\s*일\s*남음\s*$/u, '')
      .replace(/\s+D-\s*\d{1,3}\s*$/iu, '')
      .trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

/** 포털 목록에 붙는 말줄임·마감 문구 */
function stripPortalListNoise(title: string): string {
  return stripJobTitleCountdownNoise(title)
    .replace(/\s*채용\s*시까지\s*$/u, '')
    .replace(/\s*모집\s*채용\s*시까지\s*$/u, '')
    .trim();
}

/** 목록 링크에 붙은 회사명 중복 등을 정리합니다. */
export function normalizeJobTitle(raw: string): string {
  let title = stripPortalListNoise(cleanText(raw));
  const bracketMatch = title.match(/^(\[[^\]]+\][^[\n]{0,80}?채용\s*공고)/);
  if (bracketMatch) return bracketMatch[1].replace(/\s+/g, ' ').trim();

  // "농심태경 농심태경 하반기 ..." → "농심태경 하반기 ..."
  title = title.replace(/^(\S{2,20})\s+\1\s+/, '$1 ');

  /** 목록 카드는 CSS line-clamp로 줄입니다. 저장·상세는 전체 제목을 유지합니다. */
  return title;
}

export function mergeCompanyAndTitle(companyName: string | undefined, title: string): string {
  const normalizedTitle = normalizeJobTitle(title);
  const company = companyName?.trim();
  if (!company) return normalizedTitle;
  if (normalizedTitle.startsWith(company)) return normalizedTitle;
  return normalizeJobTitle(`${company} ${normalizedTitle}`);
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 목록 링크에 붙은 회사명 중복 등을 정리합니다. */
export function normalizeJobTitle(raw: string): string {
  let title = cleanText(raw);
  const bracketMatch = title.match(/^(\[[^\]]+\][^[\n]{0,80}?채용\s*공고)/);
  if (bracketMatch) return bracketMatch[1].replace(/\s+/g, ' ').trim();

  // "농심태경 농심태경 하반기 ..." → "농심태경 하반기 ..."
  title = title.replace(/^(\S{2,20})\s+\1\s+/, '$1 ');

  if (title.length > 90) return title.slice(0, 90).trim();
  return title;
}

export function mergeCompanyAndTitle(companyName: string | undefined, title: string): string {
  const normalizedTitle = normalizeJobTitle(title);
  const company = companyName?.trim();
  if (!company) return normalizedTitle;
  if (normalizedTitle.startsWith(company)) return normalizedTitle;
  return normalizeJobTitle(`${company} ${normalizedTitle}`);
}

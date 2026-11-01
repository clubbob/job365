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

/** 포털 목록 카드에 붙은 저장·해시태그·다음 공고 조각 */
export function stripAggregatorCardNoise(title: string): string {
  let t = title.trim();
  t = t.replace(/\s+[가-힣A-Za-z][가-힣A-Za-z0-9·&.\-]{1,24}\s+\d{1,4}\s*관심없음\s*$/u, '');
  t = t.replace(/\s*관심없음\s*/gu, ' ');
  t = t.replace(/#[^\s#]+/gu, ' ');
  t = t.replace(/(?:\s+상시){2,}/gu, ' ');
  t = t.replace(/\s+상시\s*$/u, '');
  t = t.replace(
    /^[가-힣A-Za-z0-9·&.\-]{2,24}\s+(?:신입|경력|경력무관)(?:\s*·\s*(?:신입|경력|정규직|계약직|인턴|파견직|기간제|무관))+\s*·\s*[가-힣]{2,8}\s+저장\s+/u,
    '',
  );
  t = t.replace(
    /\s+(?:신입|경력)(?:\s*[,，]\s*(?:정규직|계약직|인턴|파견직))+(?:\s*[,，]\s*[가-힣]{2,8})?\s*$/u,
    '',
  );
  t = t.replace(/^([가-힣A-Za-z0-9·&.\-]{2,24})\s+(\(\s*주\s*\)\s*\1)(?=\s|$)/u, '$2');
  t = t.replace(
    /(?<=[)\]）】])\s+(?:[A-Za-z][A-Za-z0-9]{2,32}\s+)?[가-힣A-Za-z]{2,16}\s+경력\s+\d+\s*년\s+이상\s+(?:정규직|계약직)(?:\s+[가-힣]{2,8})?\s*$/u,
    '',
  );
  t = t.replace(/[\[［][\s\u00a0\u3000]*[\]］]/gu, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

/** 포털 목록에 붙는 말줄임·마감 문구 */
function stripPortalListNoise(title: string): string {
  return stripAggregatorCardNoise(stripJobTitleCountdownNoise(title))
    .replace(/^[:：]\s*/u, '')
    .replace(/\s*마감\s*\(\s*~\s*\d{4}\.\d{1,2}\.\d{1,2}\s*\)\s*$/u, '')
    .replace(/\s*마감\s*\(\s*\d{4}\.\d{1,2}\.\d{1,2}\s*\)\s*$/u, '')
    .replace(/\s*지원\s*마감(?:된|됨|완료)?\s*$/u, '')
    .replace(
      /^[^|]{0,40}\|\s*\d{2}년\s*\d{1,2}월\s*\d{1,2}일[^|]{0,40}까지\s*/u,
      '',
    )
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

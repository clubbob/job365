import { normalizeCompanyLabel } from '@/lib/crawler/company-name-match';
import { htmlToPlainText } from '@/lib/crawler/job-quality';

const MAX_ROW_LENGTH = 90;

const QUALIFICATION_TITLES = new Set([
  '자격 요건',
  '지원 자격',
  '응시 자격',
  '모집 요건',
  '자격 및 우대사항',
  '자격 및 우대',
  '필요 자격',
]);
const PROCESS_TITLES = new Set(['전형 절차', '전형 일정', '전형 절차 및 일정']);
const PERIOD_SECTION_TITLES = new Set(['접수 기간', '모집 기간', '지원 기간', '서류 접수 기간']);
const WORK_SECTION_TITLES = new Set(['주요 업무', '업무 내용', '담당 업무', '수행 업무', '업무 개요']);
const QUALIFICATION_SKIP = /병역|군필|해외여행|입영|면제|불합격|제출\s*서류/;

type DescriptionSection = {
  title: string;
  body: string;
};

type SummaryRow = {
  label: string;
  value: string | null;
};

function extractSections(html: string): DescriptionSection[] {
  const sections: DescriptionSection[] = [];
  const pattern = /<section>\s*<h3>([^<]*)<\/h3>([\s\S]*?)<\/section>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const body = match[2].trim();
    if (body) sections.push({ title: match[1].trim(), body });
  }

  return sections;
}

function combineSectionBodies(sections: DescriptionSection[]): string {
  return sections
    .map((section) => `${section.title}\n${htmlToSummaryText(section.body)}`)
    .join('\n\n');
}

function parseUnitGroupedSections(html: string): DescriptionSection[] | null {
  if (!/<strong>[^<]+<\/strong>/i.test(html)) return null;

  const chunks = html.split(/(?=<strong>)/i).filter(Boolean);
  const sections: DescriptionSection[] = [];
  let hasUnitBlocks = false;

  for (const chunk of chunks) {
    const strongMatch = chunk.match(/^<strong>([^<]*)<\/strong>/i);
    if (strongMatch) {
      hasUnitBlocks = true;
      const title = strongMatch[1].trim();
      const remainder = chunk.slice(strongMatch[0].length);
      const innerSections = extractSections(remainder);
      const combined = combineSectionBodies(innerSections);
      if (combined) sections.push({ title, body: combined });
      continue;
    }

    sections.push(...extractSections(chunk));
  }

  return hasUnitBlocks ? sections : null;
}

function parseDescriptionSections(html: string): DescriptionSection[] {
  const trimmed = html.trim();
  if (!trimmed) return [];

  const grouped = parseUnitGroupedSections(trimmed);
  if (grouped && grouped.length > 0) return grouped;

  const sections = extractSections(trimmed);
  if (sections.length > 0) return sections;

  return [{ title: '요약', body: trimmed }];
}

function htmlToSummaryText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripRedundantLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^근무 지역\s*:/.test(line) && !/^모집 인원\s*:/.test(line))
    .join('\n')
    .trim();
}

function collectSectionText(sections: DescriptionSection[], titles: Set<string>): string {
  return sections
    .filter((section) => titles.has(section.title))
    .map((section) => stripRedundantLines(htmlToSummaryText(section.body)))
    .filter(Boolean)
    .join('\n');
}

function sectionMatchesQualification(title: string): boolean {
  const normalized = normalizeSectionTitle(title);
  return /자격요건|지원자격|응시자격|모집요건|자격및우대|필요자격|지원요건|모집자격/.test(
    normalized,
  );
}

function collectQualificationText(sections: DescriptionSection[], html: string): string {
  const titled = sections
    .filter((section) => QUALIFICATION_TITLES.has(section.title) || sectionMatchesQualification(section.title))
    .map((section) => stripRedundantLines(htmlToSummaryText(section.body)))
    .filter(Boolean)
    .join('\n');
  if (titled) return titled;

  const plain = stripRedundantLines(htmlToSummaryText(html));
  const labeledLine = plain
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^(?:지원\s*자격|자격\s*요건|모집\s*요건|응시\s*자격)\s*[:：]/.test(line));
  if (labeledLine) return labeledLine;

  if (sections.length === 1 && (sections[0].title === '요약' || sections[0].title === '상세 내용')) {
    return stripRedundantLines(htmlToSummaryText(sections[0].body));
  }

  return plain;
}

function normalizeSectionTitle(title: string): string {
  return title.replace(/\s+/g, '');
}

function sectionMatchesProcess(title: string): boolean {
  const normalized = normalizeSectionTitle(title);
  return /전형|선발|채용절차|채용프로세스|채용일정|채용일정/.test(normalized);
}

function lineLooksLikeProcess(line: string): boolean {
  return /면접|입사|서류|전형|실무|최종|합격|발표|인적성|코딩|과제/.test(line);
}

function collectProcessText(sections: DescriptionSection[], html: string): string {
  const exact = collectSectionText(sections, PROCESS_TITLES);
  if (exact) return exact;

  const fuzzy = sections
    .filter((section) => sectionMatchesProcess(section.title))
    .map((section) => stripRedundantLines(htmlToSummaryText(section.body)))
    .filter(Boolean)
    .join('\n');
  if (fuzzy) return fuzzy;

  const embedded = sections
    .map((section) => stripRedundantLines(htmlToSummaryText(section.body)))
    .filter((body) => lineLooksLikeProcess(body))
    .join('\n');
  if (embedded) return embedded;

  const full = stripRedundantLines(htmlToSummaryText(html));
  const lines = full.split('\n').map(cleanListLine).filter((line) => line && lineLooksLikeProcess(line));
  return lines.join('\n');
}

function clipOneLine(text: string, max = MAX_ROW_LENGTH): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}…`;
}

function cleanListLine(line: string): string {
  return line
    .replace(/^[\s·•\-※]+/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPlainText(text: string): string {
  return text
    .split('\n')
    .map(cleanListLine)
    .filter((line) => line && !QUALIFICATION_SKIP.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function condenseQualifications(text: string): string | null {
  const plain = toPlainText(text);
  if (!plain) return null;

  const parts: string[] = [];
  const yearsMatch = plain.match(/(\d+)\s*년\s*이상/);
  const hasBachelor = /학사/.test(plain);
  const hasMasterPhd = /석사|박사|석\s*[/·]\s*박사/.test(plain);
  const studyCountsAsExp = /수학\s*기간|재학\s*기간/.test(plain) && /경력/.test(plain);

  if (hasBachelor && yearsMatch) {
    parts.push(`학사 이상, 관련 경력 ${yearsMatch[1]}년+`);
  } else if (hasBachelor) {
    parts.push('학사 이상');
  } else if (yearsMatch) {
    parts.push(`관련 경력 ${yearsMatch[1]}년+`);
  }

  if (/신입/.test(plain) && !/경력/.test(plain) && parts.length === 0) {
    parts.push('신입');
  } else if (/경력\s*무관/.test(plain) && parts.length === 0) {
    parts.push('경력 무관');
  }

  if (hasMasterPhd && studyCountsAsExp) {
    parts.push('석·박사 수학 기간 경력 인정');
  } else if (hasMasterPhd && /우대|가산/.test(plain)) {
    parts.push('석·박사 우대');
  }

  if (/관련\s*전공|전공자/.test(plain)) parts.push('관련 전공 우대');

  if (/요양보호사/.test(plain)) {
    if (/자격증|자격\s*보유|면허|취득/.test(plain)) parts.push('요양보호사 자격증');
    else if (!parts.some((p) => p.includes('요양'))) parts.push('요양보호사 관련');
  }

  if (/고졸\s*이상|대졸\s*이상|대학교\s*졸업/.test(plain) && parts.length === 0) {
    parts.push(plain.match(/(?:고졸|대졸|초대졸|대학교)\s*(?:이상|졸업)?/)?.[0] ?? '학력 요건 있음');
  }

  const certMatch = plain.match(/([가-힣]{2,}기사|[가-힣]{2,}산업기사)/);
  if (certMatch && /우대|필수|보유/.test(plain)) {
    parts.push(`${certMatch[1]} ${/필수|보유/.test(plain) ? '필수' : '우대'}`);
  }

  if (parts.length > 0) return clipOneLine(parts.join(', '));

  const fallback = plain
    .split(/[,，.]/)
    .map((part) => part.trim())
    .find((part) => /학력|경력|학사|전공|자격|우대|필수/.test(part));

  return fallback ? clipOneLine(fallback) : null;
}

function normalizeYearMonth(yearRaw: string, monthRaw: string): string {
  const year = yearRaw.replace(/'/g, '').padStart(2, '0').slice(-2);
  const month = monthRaw.padStart(2, '0');
  return `'${year}.${month}`;
}

function extractDateFromSegment(segment: string): string | null {
  const dotRange = segment.match(/'(\d{2})\.(\d{1,2})\s*[~\-–]\s*'(\d{2})\.(\d{1,2})/);
  if (dotRange) {
    const range = `'${dotRange[1]}.${dotRange[2]}~'${dotRange[3]}.${dotRange[4]}`;
    return /예정|중/.test(segment) ? `${range} 예정` : range;
  }

  const dotSingle = segment.match(/'(\d{2})\.(\d{1,2})/);
  if (dotSingle) {
    const date = `'${dotSingle[1]}.${dotSingle[2]}`;
    return /예정|중/.test(segment) ? `${date} 예정` : date;
  }

  const sameYearRange = segment.match(/('?\d{2})\s*년?\s*(\d{1,2})\s*월?\s*[~\-–]\s*(\d{1,2})\s*월?/);
  if (sameYearRange) {
    const start = normalizeYearMonth(sameYearRange[1], sameYearRange[2]);
    const end = normalizeYearMonth(sameYearRange[1], sameYearRange[3]);
    const range = `${start}~${end}`;
    return /예정|중/.test(segment) ? `${range} 예정` : range;
  }

  const fullRange = segment.match(
    /('?\d{2})\s*년?\s*(\d{1,2})\s*월?\s*[~\-–]\s*('?\d{2})\s*년?\s*(\d{1,2})\s*월?/,
  );
  if (fullRange) {
    const range = `${normalizeYearMonth(fullRange[1], fullRange[2])}~${normalizeYearMonth(fullRange[3], fullRange[4])}`;
    return /예정|중/.test(segment) ? `${range} 예정` : range;
  }

  const single = segment.match(/('?\d{2})\s*년?\s*(\d{1,2})\s*월?/);
  if (single) {
    const date = normalizeYearMonth(single[1], single[2]);
    return /예정|중/.test(segment) ? `${date} 예정` : date;
  }

  return null;
}

function extractProcessTiming(label: '면접' | '입사', plain: string): string | null {
  const segment =
    plain.match(new RegExp(`${label}(?:\\s*(?:일정|예정|전형))?[^.\\n]{0,72}`, 'i'))?.[0] ??
    plain.match(new RegExp(`${label}[^.\\n]{0,72}`, 'i'))?.[0];
  if (!segment) return null;

  return extractDateFromSegment(segment);
}

function summarizeProcessSteps(plain: string): string | null {
  const steps: string[] = [];
  if (/서류/.test(plain)) steps.push('서류');
  if (/인적성|코딩|과제|실무/.test(plain)) {
    if (/인적성/.test(plain)) steps.push('인적성');
    else if (/코딩|과제|실무/.test(plain)) steps.push('실무');
  }
  if (/면접/.test(plain)) steps.push('면접');
  if (/최종/.test(plain)) steps.push('최종');

  if (steps.length >= 2) return steps.join(' → ');
  return null;
}

function condenseProcess(text: string): string | null {
  const plain = toPlainText(text);
  if (!plain) return null;

  const parts: string[] = [];
  const interview = extractProcessTiming('면접', plain);
  const joining = extractProcessTiming('입사', plain);

  if (interview) parts.push(`면접 ${interview}`);
  if (joining) parts.push(`입사 ${joining}`);

  if (parts.length > 0) return clipOneLine(parts.join(', '));

  const steps = summarizeProcessSteps(plain);
  if (steps) return clipOneLine(steps);

  const fallbackLine = plain
    .split(/[,，]/)
    .map((part) => part.trim())
    .find((part) => lineLooksLikeProcess(part));
  if (fallbackLine) {
    const shortened = fallbackLine
      .replace(/일정\s*[:：]\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return clipOneLine(shortened);
  }

  return null;
}

function extractDeadlineShort(text: string): string | null {
  const detailed = text.match(
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^.\n]*?(오전|오후)?\s*(\d{1,2})시/,
  );
  if (detailed) {
    const [, year, month, day, , hour] = detailed;
    return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')} ${hour}시 마감`;
  }

  const range = text.match(
    /(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})\s*일?\s*[~\-–]\s*(\d{4})[.\-/년]?\s*(\d{1,2})[.\-/월]?\s*(\d{1,2})\s*일?/,
  );
  if (range) {
    return `${range[1]}.${range[2].padStart(2, '0')}.${range[3].padStart(2, '0')} ~ ${range[4]}.${range[5].padStart(2, '0')}.${range[6].padStart(2, '0')}`;
  }

  const simple = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (simple) {
    return `${simple[1]}.${simple[2].padStart(2, '0')}.${simple[3].padStart(2, '0')} 마감`;
  }

  return null;
}

function formatDeadlineForSummary(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3]} 마감`;
}

function isGenericOpenDeadline(text: string): boolean {
  return /채용\s*시까지|상시\s*채용|상시\s*모집|수시\s*모집|미정/.test(text) && !/\d{4}/.test(text);
}

function condenseApplicationDeadline(
  sections: DescriptionSection[],
  html: string,
  deadline: string | null | undefined,
): string | null {
  const sectionText = collectSectionText(sections, PERIOD_SECTION_TITLES);
  const plain = htmlToSummaryText(sectionText || html);
  const periodLine = plain
    .split('\n')
    .map((line) => line.trim())
    .find(
      (line) =>
        /(?:접수|모집|지원|서류)\s*기간|접수\s*마감|지원\s*마감|마감\s*일/.test(line) && /\d/.test(line),
    );
  const fromLine = periodLine
    ? clipOneLine(periodLine.replace(/^[^:：\n]+[:：]\s*/, ''))
    : null;
  const fromText = extractDeadlineShort(plain);
  const fromJob = formatDeadlineForSummary(deadline);

  const candidate = fromLine ?? fromText ?? fromJob;
  if (!candidate || isGenericOpenDeadline(candidate)) return null;
  return candidate;
}

function normalizeWorkSummaryText(text: string): string {
  return text
    .replace(/^상세\s*내용\s*/u, '')
    .replace(/채용\s*시까지\s*/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCompanyNameVariants(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const withoutCorp = trimmed.replace(/^\(\s*주\s*\)\s*/u, '').replace(/주식회사$/u, '').trim();
  const variants = new Set<string>([trimmed, withoutCorp]);
  if (withoutCorp.length >= 2) {
    variants.add(`(주)${withoutCorp}`);
    variants.add(`(주) ${withoutCorp}`);
    variants.add(`${withoutCorp}주식회사`);
    variants.add(`㈜${withoutCorp}`);
  }
  return [...variants].filter((value) => value.length >= 2);
}

function cleanWorkSummaryTail(text: string, companyHints: string[]): string {
  let result = text.trim();

  result = result.replace(/\(\s*주\s*\)\s*[가-힣A-Za-z0-9·&.]+\s*$/u, '').trim();
  result = result.replace(/[가-힣A-Za-z0-9·&.]+\s*주식회사\s*$/u, '').trim();
  result = result.replace(/㈜\s*[가-힣A-Za-z0-9·&.]+\s*$/u, '').trim();

  const variants = new Set<string>();
  for (const hint of companyHints) {
    for (const variant of buildCompanyNameVariants(hint)) variants.add(variant);
  }

  for (const variant of variants) {
    const escaped = escapeRegExp(variant);
    result = result.replace(new RegExp(`[,.\\s]*${escaped}\\s*$`, 'iu'), '').trim();
    result = result.replace(new RegExp(`^\\s*${escaped}\\s*[:：\\-·]\\s*`, 'iu'), '').trim();
  }

  const trailingCompany = result.match(/(?:^|[,.。\s])(\(\s*주\s*\)\s*)?([가-힣A-Za-z0-9·&.]{2,40})\s*$/u);
  if (trailingCompany?.[2]) {
    const tailNorm = normalizeCompanyLabel(trailingCompany[2]);
    for (const hint of companyHints) {
      const hintNorm = normalizeCompanyLabel(hint);
      if (
        hintNorm.length >= 3 &&
        (tailNorm === hintNorm || tailNorm.includes(hintNorm) || hintNorm.includes(tailNorm))
      ) {
        result = result.slice(0, result.length - trailingCompany[0].length).trim();
        break;
      }
    }
  }

  result = result.replace(/[,.]?\s*\(\s*주\s*\)\s*$/u, '').trim();
  return result.replace(/[,.。\s]+$/, '').trim();
}

function stripNoiseHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
}

function looksLikeHtmlMarkup(text: string): boolean {
  return /<[a-z!/]/i.test(text) || /\bclass\s*=|data-v-|dark:bg-|bg-gray-/i.test(text);
}

function hasMeaningfulKorean(text: string): boolean {
  const hangul = (text.match(/[가-힣]/g) ?? []).length;
  return hangul >= 6;
}

function isLowQualityWorkSummary(text: string): boolean {
  if (!text || text.length < 10) return true;
  if (/^상세\s*내용/.test(text)) return true;
  if (/채용\s*시까지/.test(text)) return true;
  if (looksLikeHtmlMarkup(text)) return true;
  if (!hasMeaningfulKorean(text)) return true;
  return false;
}

function pickWorkSummaryFromPlain(plain: string, companyHints: string[]): string | null {
  const condensed = clipOneLine(cleanWorkSummaryTail(normalizeWorkSummaryText(plain), companyHints));
  if (!condensed || isLowQualityWorkSummary(condensed)) return null;
  return condensed;
}

function lineLooksLikeWorkSummary(line: string): boolean {
  if (line.length < 12 || line.length > MAX_ROW_LENGTH + 40) return false;
  if (/전형|접수\s*기간|지원\s*방법|자격\s*요건|모집\s*인원/.test(line)) return false;
  return true;
}

function pickWorkSummaryFromHtml(html: string, companyHints: string[]): string | null {
  const plain = stripRedundantLines(htmlToSummaryText(stripNoiseHtml(html)));
  const lines = plain.split('\n').map((item) => item.trim()).filter(Boolean);

  for (const line of lines) {
    if (!lineLooksLikeWorkSummary(line)) continue;
    const picked = pickWorkSummaryFromPlain(line, companyHints);
    if (picked) return picked;
  }

  const fallback = pickWorkSummaryFromPlain(plain, companyHints);
  if (fallback) return fallback;

  return pickWorkSummaryFromPlain(htmlToPlainText(stripNoiseHtml(html)), companyHints);
}

function condenseWorkSummary(
  sections: DescriptionSection[],
  html: string,
  companyHints: string[],
): string | null {
  const sectionText = collectSectionText(sections, WORK_SECTION_TITLES);
  if (sectionText) {
    const picked = pickWorkSummaryFromHtml(sectionText, companyHints);
    if (picked) return picked;
  }

  const detailSection = sections.find((section) =>
    /^(상세\s*내용|요약)$/.test(section.title.replace(/\s+/g, '')),
  );
  if (detailSection?.body) {
    const picked = pickWorkSummaryFromHtml(detailSection.body, companyHints);
    if (picked) return picked;
  }

  return pickWorkSummaryFromHtml(html, companyHints);
}

function prepareJobSummaryRows(html: string, companyHints: string[]): SummaryRow[] {
  const sections = parseDescriptionSections(html);
  const rows: SummaryRow[] = [];

  const work = condenseWorkSummary(sections, html, companyHints);
  if (work) rows.push({ label: '업무', value: work });

  const process = condenseProcess(collectProcessText(sections, html));
  if (process) rows.push({ label: '전형', value: process });

  return rows;
}

export type CrawledJobSummaryField = { label: string; value: string };

/** 모집 요강에 넣을 업무·전형 등 본문 요약 필드 */
export function getCrawledJobSummaryFields(
  html: string,
  companyHints: string[],
): CrawledJobSummaryField[] {
  return prepareJobSummaryRows(html, companyHints)
    .filter((row) => row.value?.trim())
    .map((row) => ({ label: row.label, value: row.value!.trim() }));
}

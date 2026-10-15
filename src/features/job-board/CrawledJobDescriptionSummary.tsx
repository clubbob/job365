import { normalizeCompanyLabel } from '@/lib/crawler/company-name-match';
import { htmlToPlainText } from '@/lib/crawler/job-quality';

const MAX_ROW_LENGTH = 90;

const PROCESS_TITLES = new Set(['전형 절차', '전형 일정', '전형 절차 및 일정']);
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

function normalizeWorkSummaryText(text: string): string {
  return text
    .replace(/^상세\s*내용\s*/u, '')
    .replace(/^\d{1,3}일\s*남음\s*/u, '')
    .replace(/^(?:D-?\d{1,3}|마감\s*\d{1,3}일)\s*/iu, '')
    .replace(/채용\s*시까지\s*/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 포털 목록·카드에 붙는 마감 카운트·공고 제목 한 줄 */
function looksLikePortalJobTitleLine(line: string): boolean {
  const text = line.trim();
  if (!text) return true;
  if (/^\d{1,3}일\s*남음/u.test(text)) return true;
  if (/\d{1,3}일\s*남음/u.test(text) && /채용|모집|디자이너|개발|담당|매니저/u.test(text)) return true;
  if (/채용\s*주식회사/u.test(text)) return true;
  if (/\|\s*(?:중소|중견|대)기업/u.test(text)) return true;
  if (/\(\s*신입\s*[~\-]?\s*\d+\s*년차\s*\)/u.test(text) && /채용/u.test(text)) return true;
  return false;
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
  if (looksLikePortalJobTitleLine(text)) return true;
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
  if (looksLikePortalJobTitleLine(line)) return false;
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

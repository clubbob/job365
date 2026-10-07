import { DetailSection } from '@/components/ui/PostingDetail';

const MAX_ROW_LENGTH = 90;

const QUALIFICATION_TITLES = new Set(['자격 요건']);
const PROCESS_TITLES = new Set(['전형 절차', '전형 일정', '접수 기간', '전형 절차 및 일정']);
const APPLICATION_TITLES = new Set(['지원 방법']);

const APPLICATION_BOILERPLATE = /서류\s*반환|반환신청|반환해\s*드리|지원가이드|불편을\s*최소화/;
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

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

function extractDeadlineShort(text: string): string | null {
  const detailed = text.match(
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^.\n]*?(오전|오후)?\s*(\d{1,2})시/,
  );
  if (detailed) {
    const [, year, month, day, , hour] = detailed;
    return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')} ${hour}시 마감`;
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

function extractApplicationDomain(text: string, originalJobUrl: string): string | null {
  const urlMatch = text.match(/https?:\/\/(?:www\.)?([^/\s)）]+)/i);
  const domain = urlMatch?.[1] ?? domainFromUrl(originalJobUrl);
  return domain?.replace(/[)）].*$/, '').trim() || null;
}

function condenseApplication(
  text: string,
  originalJobUrl: string,
  deadline: string | null | undefined,
): string | null {
  const plain = toPlainText(text);
  const domain = extractApplicationDomain(plain, originalJobUrl);
  const deadlineText = extractDeadlineShort(plain) ?? formatDeadlineForSummary(deadline);

  const parts = [domain, deadlineText].filter(Boolean);
  if (parts.length > 0) return clipOneLine(parts.join(' · '));

  if (/로그인|회원\s*가입|지원서/.test(plain) && domain) {
    return clipOneLine(`${domain} · 온라인 지원`);
  }

  return null;
}

function prepareJobSummaryRows(
  html: string,
  originalJobUrl: string,
  deadline: string | null | undefined,
): SummaryRow[] {
  const sections = parseDescriptionSections(html);

  return [
    { label: '자격', value: condenseQualifications(collectSectionText(sections, QUALIFICATION_TITLES)) },
    { label: '전형', value: condenseProcess(collectProcessText(sections, html)) },
    {
      label: '지원',
      value: condenseApplication(collectSectionText(sections, APPLICATION_TITLES), originalJobUrl, deadline),
    },
  ];
}

function hasAnySummaryValue(rows: SummaryRow[]): boolean {
  return rows.some((row) => row.value);
}

type CrawledJobDescriptionSummaryProps = {
  html: string;
  originalJobUrl: string;
  deadline?: string | null;
  linkClassName: string;
};

export default function CrawledJobDescriptionSummary({
  html,
  originalJobUrl,
  deadline,
  linkClassName,
}: CrawledJobDescriptionSummaryProps) {
  const rows = prepareJobSummaryRows(html, originalJobUrl, deadline);

  if (!hasAnySummaryValue(rows)) {
    return (
      <DetailSection title="안내">
        <p className="text-sm text-muted">
          요약을 표시할 내용이 없습니다.{' '}
          <a href={originalJobUrl} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            원문 공고
          </a>
          에서 확인해 주세요.
        </p>
      </DetailSection>
    );
  }

  return (
    <>
      <DetailSection title="공고 요약">
        <dl className="divide-y divide-border">
          {rows.map((row) => {
            const value = row.value?.trim() ? row.value : '—';
            return (
              <div
                key={row.label}
                className="grid grid-cols-[3.5rem_1fr] gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[4.5rem_1fr]"
              >
                <dt className="text-sm font-semibold text-foreground">{row.label}</dt>
                <dd className="text-sm leading-relaxed text-muted">{value}</dd>
              </div>
            );
          })}
        </dl>
      </DetailSection>
      <p className="text-sm text-muted">
        상세 내용은{' '}
        <a href={originalJobUrl} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          원문 공고
        </a>
        에서 확인하세요. 지원하기 클릭 시 해당 사이트로 연결됩니다. 찜하기 클릭 시 마이페이지에서 조회 가능합니다.
      </p>
    </>
  );
}

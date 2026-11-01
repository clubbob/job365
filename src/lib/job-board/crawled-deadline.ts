import { getKoreaDateLocalToday } from '@/lib/datetime';

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeStoredDeadline(deadline: string | null | undefined): string | null {
  if (deadline == null || deadline === '' || deadline === 'open') return null;
  const match = deadline.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1]! : null;
}

function normalizeTitleYear(yearRaw: number): number {
  if (yearRaw < 100) return 2000 + yearRaw;
  return yearRaw;
}

function parseKoreanCalendarDateInTitle(title: string): string | null {
  const until = title.match(
    /(\d{2}|\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*(?:오전|오후)\s*\d{1,2}시(?:\s*\d{1,2}분)?)?\s*까지/u,
  );
  if (until) {
    return toIsoDate(normalizeTitleYear(+until[1]), +until[2], +until[3]);
  }
  return null;
}

/** 제목의 (~10.14 오전 아홉시까지)처럼 연도 없는 월.일 마감 */
function parseMonthDayUntilInTitle(
  title: string,
  todayDate = getKoreaDateLocalToday(),
): string | null {
  const match = title.match(/~\s*(\d{1,2})\.(\d{1,2})(?:\s*(?:오전|오후))?[^)]{0,12}까지/u);
  if (!match) return null;
  const month = +match[1];
  const day = +match[2];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = Number.parseInt(todayDate.slice(0, 4), 10);
  return toIsoDate(year, month, day);
}

function lastIsoDateOfMonth(year: number, month: number): string | null {
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(year, month, 0).getDate();
  return toIsoDate(year, month, lastDay);
}

/** 제목에만 있는 '8월 수시채용' 같은 월 단위 공고 → 그 달 말일을 마감으로 봅니다. */
function parseNamedRecruitmentMonthEnd(
  title: string,
  todayDate = getKoreaDateLocalToday(),
): string | null {
  const monthPhrase =
    /(\d{1,2})\s*월\s*(?:수시\s*채용|(?:공개|정기)\s*채용|채용합니다|모집합니다|공채)/u;
  const withYear = title.match(
    /(\d{2}|\d{4})\s*년\s*(\d{1,2})\s*월\s*(?:수시\s*채용|(?:공개|정기)\s*채용|채용합니다|모집합니다|공채)/u,
  );
  if (withYear) {
    return lastIsoDateOfMonth(normalizeTitleYear(+withYear[1]), +withYear[2]);
  }
  const monthOnly = title.match(monthPhrase);
  if (!monthOnly) return null;
  const month = +monthOnly[1];
  const year = Number.parseInt(todayDate.slice(0, 4), 10);
  return lastIsoDateOfMonth(year, month);
}

/** 제목에 마감·종료가 명시된 공고 (포털 목록 오탐) */
export function isTitleMarkedRecruitmentClosed(title: string): boolean {
  return /지원\s*마감(?:된|됨|완료)?|모집\s*마감(?:된|됨|완료)?|접수\s*마감(?:된|됨)?|채용\s*종료|공고\s*마감|마감\s*된\s*공고/u.test(
    title,
  );
}

function plainDeadlineText(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 접수기간 2026.10.13 ~ 2026.10.23 → 마지막 날 */
function parseApplicationPeriodEnd(text: string): string | null {
  const trimmed = plainDeadlineText(text);
  if (!trimmed) return null;
  const labeled = trimmed.match(
    /(?:접수|지원|모집)\s*기간[^0-9]{0,24}(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\s*[~\-–]\s*(?:(\d{4})[.\-/])?(\d{1,2})[.\-/](\d{1,2})/u,
  );
  if (labeled) {
    const endYear = labeled[4] ? +labeled[4] : +labeled[1];
    return toIsoDate(endYear, +labeled[5], +labeled[6]);
  }
  return null;
}

/** 제목·포털 목록에 붙은 마감일 (예: 마감 (~2026.03.25), 26년 09월 21일 … 까지) */
export function parseDeadlineFromJobTitle(title: string): string | null {
  const trimmed = title.trim();
  const patterns = [
    /마감\s*\(\s*~\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*\)/u,
    /마감\s*\(\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*\)/u,
    /마감\s+~\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/u,
    /\(~\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*\)\s*$/u,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return toIsoDate(+match[1], +match[2], +match[3]);
  }

  return (
    parseApplicationPeriodEnd(trimmed) ??
    parseKoreanCalendarDateInTitle(trimmed) ??
    parseMonthDayUntilInTitle(trimmed) ??
    parseNamedRecruitmentMonthEnd(trimmed)
  );
}

function earliestIsoDate(...values: Array<string | null>): string | null {
  const dates = values.filter((value): value is string => Boolean(value)).sort();
  return dates[0] ?? null;
}

/** DB 마감일과 제목·본문에 적힌 마감일 중 더 이른 날짜를 씁니다. */
export function effectiveCrawledJobDeadline(
  deadline: string | null | undefined,
  title: string,
  extraText = '',
): string | null {
  const fromField = normalizeStoredDeadline(deadline);
  const fromTitle = parseDeadlineFromJobTitle(title);
  const fromBody = extraText ? parseApplicationPeriodEnd(extraText) : null;
  return earliestIsoDate(fromField, fromTitle, fromBody);
}

/** 수집 공고 마감일(YYYY-MM-DD)이 오늘(KST) 이전이면 false. 없거나 상시는 true. */
export function isCrawledJobDeadlineOpen(
  deadline: string | null | undefined,
  todayDate = getKoreaDateLocalToday(),
): boolean {
  const iso = normalizeStoredDeadline(deadline);
  if (!iso) return true;
  return iso >= todayDate;
}

/** 제목에 박힌 마감일까지 반영해 목록 노출 가능 여부 */
export function isCrawledJobPostingOpen(
  deadline: string | null | undefined,
  title: string,
  todayDate = getKoreaDateLocalToday(),
  extraText = '',
): boolean {
  if (isTitleMarkedRecruitmentClosed(title) || isTitleMarkedRecruitmentClosed(extraText)) {
    return false;
  }
  const effective = effectiveCrawledJobDeadline(deadline, title, extraText);
  return isCrawledJobDeadlineOpen(effective, todayDate);
}

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

/** 제목에 마감·종료가 명시된 공고 (포털 목록 오탐) */
export function isTitleMarkedRecruitmentClosed(title: string): boolean {
  return /지원\s*마감(?:된|됨|완료)?|모집\s*마감(?:된|됨|완료)?|접수\s*마감(?:된|됨)?|채용\s*종료|공고\s*마감|마감\s*된\s*공고/u.test(
    title,
  );
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

  return parseKoreanCalendarDateInTitle(trimmed);
}

/** DB 마감일과 제목에 적힌 마감일 중 더 이른 날짜를 씁니다. */
export function effectiveCrawledJobDeadline(
  deadline: string | null | undefined,
  title: string,
): string | null {
  const fromField = normalizeStoredDeadline(deadline);
  const fromTitle = parseDeadlineFromJobTitle(title);
  if (fromField && fromTitle) return fromField <= fromTitle ? fromField : fromTitle;
  return fromField ?? fromTitle;
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
): boolean {
  if (isTitleMarkedRecruitmentClosed(title)) return false;
  const effective = effectiveCrawledJobDeadline(deadline, title);
  return isCrawledJobDeadlineOpen(effective, todayDate);
}

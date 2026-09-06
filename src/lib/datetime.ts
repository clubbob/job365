const KOREA_TZ = 'Asia/Seoul';
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad2(value: string | number): string {
  return String(value).padStart(2, '0');
}

export function getKoreaDateTimeLocalMin(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KOREA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  const hour = Number(part('hour')) % 24;

  return `${part('year')}-${part('month')}-${part('day')}T${pad2(hour)}:${pad2(part('minute'))}`;
}

export function getKoreaDateLocalToday(date = new Date()): string {
  return getKoreaDateTimeLocalMin(date).split('T')[0]!;
}

export function parseKoreaDateParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function isKoreaDateTimeLocalComplete(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

export function koreaDateTimeLocalToTimestamp(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return Date.UTC(year, month - 1, day, hour, minute) - KOREA_OFFSET_MS;
}

export function isBeforeKoreaMinDateTimeLocal(value: string, min = getKoreaDateTimeLocalMin()): boolean {
  const valueTs = koreaDateTimeLocalToTimestamp(value);
  const minTs = koreaDateTimeLocalToTimestamp(min);
  if (valueTs === null || minTs === null) return true;
  return valueTs < minTs;
}

export function clampToKoreaMinDateTimeLocal(value: string, min = getKoreaDateTimeLocalMin()): string {
  if (!value) return '';
  if (isBeforeKoreaMinDateTimeLocal(value, min)) return min;
  return value;
}

export function getKoreaDateFromDateTimeLocal(value: string): string {
  return value.split('T')[0] ?? '';
}

export function addDaysToKoreaDate(date: string, days: number): string {
  const ts = koreaDateTimeLocalToTimestamp(`${date}T12:00`);
  if (ts === null) return date;
  return getKoreaDateTimeLocalMin(new Date(ts + days * 86_400_000)).split('T')[0]!;
}

export function getKoreaMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function addMonthsToKoreaMonthKey(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getKoreaMonthStartDate(monthKey: string): string {
  return `${monthKey}-01`;
}

export function getKoreaMonthEndDate(monthKey: string): string {
  const nextMonthStart = `${addMonthsToKoreaMonthKey(monthKey, 1)}-01`;
  return addDaysToKoreaDate(nextMonthStart, -1);
}

export function formatKoreaMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${year}년 ${Number(month)}월`;
}

const KOREA_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function getKoreaWeekdayLabel(date: string): string {
  const parsed = Date.parse(`${date}T12:00:00+09:00`);
  if (Number.isNaN(parsed)) return '';
  return KOREA_WEEKDAY_LABELS[new Date(parsed).getUTCDay()] ?? '';
}

export function formatKoreaDateWithWeekday(date: string): string {
  const weekday = getKoreaWeekdayLabel(date);
  return weekday ? `${date} (${weekday})` : date;
}

export function formatKoreaWeekRangeLabel(weekStart: string, weekEnd: string): string {
  return `${formatKoreaDateWithWeekday(weekStart)} ~ ${formatKoreaDateWithWeekday(weekEnd)}`;
}

export function formatKoreaDateWithWeekdayNoYear(date: string): string {
  const [, month, day] = date.split('-');
  const weekday = getKoreaWeekdayLabel(date);
  const shortDate = `${month}-${day}`;
  return weekday ? `${shortDate} (${weekday})` : shortDate;
}

export function formatKoreaWeekRangeLabelNoYear(weekStart: string, weekEnd: string): string {
  return `${formatKoreaDateWithWeekdayNoYear(weekStart)} ~ ${formatKoreaDateWithWeekdayNoYear(weekEnd)}`;
}

export function formatKoreaDateCompactWithWeekday(date: string): string {
  const [, month, day] = date.split('-');
  const weekday = getKoreaWeekdayLabel(date);
  const compactDate = `${Number(month)}/${Number(day)}`;
  return weekday ? `${compactDate} (${weekday})` : compactDate;
}

export function formatKoreaWeekRangeCompactLabel(weekStart: string, weekEnd: string): string {
  return `${formatKoreaDateCompactWithWeekday(weekStart)}~${formatKoreaDateCompactWithWeekday(weekEnd)}`;
}

export function formatKoreaMonthShortLabel(monthKey: string): string {
  const month = Number(monthKey.split('-')[1]);
  return `${month}월 일정`;
}

/** 내부 00~23시를 화면 표시용 01~24시로 변환 (0시 → 24시) */
export function internalHourToDisplayHour(hour: number): number {
  return hour === 0 ? 24 : hour;
}

/** 화면 01~24시를 내부 00~23시로 변환 (24시 → 0시) */
export function displayHourToInternalHour(hour: number): number {
  return hour === 24 ? 0 : hour;
}

export function splitKoreaDateTimeLocal(value: string): {
  date: string;
  displayHour: number;
  minute: number;
} {
  if (!value) {
    return { date: '', displayHour: 12, minute: 0 };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { date: value, displayHour: 12, minute: 0 };
  }

  const [date, time] = value.split('T');
  const [hourPart, minutePart] = (time ?? '').split(':');
  const internalHour = Number(hourPart);

  return {
    date: date ?? '',
    displayHour: internalHourToDisplayHour(internalHour),
    minute: Number(minutePart) || 0,
  };
}

export function combineKoreaDateTimeLocal(
  date: string,
  displayHour: number,
  minute: number,
): string {
  if (!date) return '';

  let targetDate = date;
  let internalHour = displayHourToInternalHour(displayHour);
  const safeMinute = displayHour === 24 ? 0 : minute;

  if (displayHour === 24) {
    targetDate = addDaysToKoreaDate(date, 1);
    internalHour = 0;
  }

  return `${targetDate}T${pad2(internalHour)}:${pad2(safeMinute)}`;
}

export function formatDurationMinutes(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded}분`;

  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (rest === 0) return `${hours}시간`;
  return `${hours}시간 ${rest}분`;
}

export function splitTimeHm(value: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return { hour: 9, minute: 0 };

  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return { hour, minute };
}

export function formatTimeHm(hour: number, minute: number): string {
  const safeHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const safeMinute = Math.min(59, Math.max(0, Math.floor(minute)));
  return `${pad2(safeHour)}:${pad2(safeMinute)}`;
}

export function buildScheduleMinuteOptions(selectedMinute: number): number[] {
  const options = Array.from({ length: 12 }, (_, index) => index * 5);
  if (!options.includes(selectedMinute)) {
    options.push(selectedMinute);
    options.sort((a, b) => a - b);
  }
  return options;
}

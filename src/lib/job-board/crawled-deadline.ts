import { getKoreaDateLocalToday } from '@/lib/datetime';

/** 수집 공고 마감일(YYYY-MM-DD)이 오늘(KST) 이전이면 false. 없거나 상시는 true. */
export function isCrawledJobDeadlineOpen(
  deadline: string | null | undefined,
  todayDate = getKoreaDateLocalToday(),
): boolean {
  if (deadline == null || deadline === '' || deadline === 'open') return true;
  const match = deadline.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return true;
  return match[1]! >= todayDate;
}

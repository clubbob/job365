export const PAGES_PER_GROUP = 10;

export function getPageGroupRange(
  currentPage: number,
  totalPages: number,
): { groupStart: number; groupEnd: number } {
  const groupStart = Math.floor((currentPage - 1) / PAGES_PER_GROUP) * PAGES_PER_GROUP + 1;
  const groupEnd = Math.min(groupStart + PAGES_PER_GROUP - 1, totalPages);
  return { groupStart, groupEnd };
}

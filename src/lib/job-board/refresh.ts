export const JOB_BOARD_REFRESH_EVENT = 'job365:job-board-refresh';

/** 채용 목록: URL·페이지 유지하고 데이터만 다시 불러옵니다. */
export function requestJobBoardRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(JOB_BOARD_REFRESH_EVENT));
}

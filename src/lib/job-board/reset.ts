export const JOB_BOARD_RESET_EVENT = 'job365:job-board-reset';

export function requestJobBoardReset(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(JOB_BOARD_RESET_EVENT));
}

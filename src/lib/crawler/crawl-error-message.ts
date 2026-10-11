/** 관리자·API에 노출할 수집 실패 메시지 */
export function formatCrawlRunErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : '수집에 실패했습니다.';
  if (/Executable doesn't exist|playwright install|browserType\.launch/i.test(raw)) {
    return 'Playwright Chromium이 설치되지 않았습니다. 프로젝트 루트에서 `pnpm playwright:install`을 실행한 뒤 다시 시도해 주세요.';
  }
  return raw;
}

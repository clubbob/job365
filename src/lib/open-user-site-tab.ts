/**
 * 관리자 탭은 그대로 두고 구직자 사이트만 새 브라우저 탭으로 엽니다.
 * (현재 탭에서 공개 경로로 이동하지 않도록 `<a href>`·Next `Link` 대신 버튼 + 이 함수를 씁니다.)
 */
export function openUserFacingSiteInNewTab(path = '/'): void {
  const url = new URL(path, window.location.origin).href;

  const opened = window.open(url, '_blank');
  if (opened) {
    opened.opener = null;
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export const openUserFacingSiteInNewTabTitle = '새 브라우저 탭에서 구직자 사이트를 엽니다';

/** @deprecated openUserFacingSiteInNewTab */
export function openInNewBrowserTab(href: string): void {
  openUserFacingSiteInNewTab(href);
}

/** @deprecated openUserFacingSiteInNewTab */
export function openInDesktopBrowserWindow(href: string): void {
  openUserFacingSiteInNewTab(href);
}

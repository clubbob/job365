/** crawl-targets에 섞인 줄바꿈·[3] 같은 탐색 잔여 문자열 제거 */
export function normalizeStoredCareersUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let url = raw.trim();
  const firstLine = url.split(/[\r\n]+/)[0]?.trim() ?? '';
  url = firstLine.replace(/\\n\[.*?\]$/i, '').replace(/\s+\[\d+\]$/i, '').trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;
  return url;
}

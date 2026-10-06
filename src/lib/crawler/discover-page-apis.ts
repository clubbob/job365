export type DiscoveredPageApi = {
  path: string;
  method: 'GET' | 'POST';
};

function normalizePath(path: string): string {
  return path.trim().replace(/^\.\//, '/');
}

/** 채용 목록 페이지 HTML에서 AJAX 엔드포인트를 찾습니다. */
export function discoverPageApis(html: string): DiscoveredPageApi[] {
  const found: DiscoveredPageApi[] = [];
  const seen = new Set<string>();

  const patterns: Array<{ regex: RegExp; method: 'GET' | 'POST' }> = [
    { regex: /\$\.post\(\s*["']([^"']+)["']/g, method: 'POST' },
    { regex: /\$\.get\(\s*["']([^"']+)["']/g, method: 'GET' },
    { regex: /\$\.ajax\(\s*\{[^}]*url\s*:\s*["']([^"']+)["']/g, method: 'POST' },
    { regex: /fetch\(\s*["']([^"']+)["']/g, method: 'GET' },
  ];

  for (const { regex, method } of patterns) {
    for (const match of html.matchAll(regex)) {
      const path = normalizePath(match[1] ?? '');
      if (
        !path ||
        !/^\/[^"']*(?:recruit|job|notice|career|position|\/hr\/|list\.data|detail\.data)/i.test(path)
      ) {
        continue;
      }
      if (/autocomplete|login|scrap|share|chk/i.test(path)) continue;
      const key = `${method}:${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ path, method });
    }
  }

  return found;
}

/** 상세 URL 패턴(예: /Recruit/Detail/ + noticeID)을 찾습니다. */
export function discoverDetailUrlPrefix(html: string): string | null {
  const match = html.match(
    /["']([^"']*\/(?:Detail|detail|View|view|Notice|notice)\/)[^"']*["']\s*\+\s*[a-zA-Z_$][\w$.]*\.(?:noticeID|noticeId|jobNoticeId|jobNoticeNo|recruitId|id)\b/i,
  );
  return match?.[1] ?? null;
}

/** 수집 HTML·API 텍스트의 HTML 엔티티를 풉니다(이중 이스케이프 포함). */
export function decodeHtmlEntities(text: string): string {
  let out = text;
  for (let i = 0; i < 4; i += 1) {
    const next = out
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
    if (next === out) break;
    out = next;
  }
  return out;
}

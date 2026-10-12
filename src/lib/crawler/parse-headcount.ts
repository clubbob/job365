import { htmlToPlainText } from '@/lib/crawler/job-quality';

function normalizeHeadcountValue(raw: string): string | null {
  const value = raw.replace(/\s+/g, ' ').trim();
  if (!value || /^[-–—·…]+$/.test(value)) return null;
  if (/미정|무관|해당\s*없|없음|미기재|비공개/i.test(value)) return null;
  if (/^0+\s*명?$/.test(value)) return null;

  const digits = value.match(/(\d+)\s*(?:~\s*(\d+))?\s*명?/);
  if (digits) {
    const end = digits[2];
    return end ? `${digits[1]}~${end}명` : `${digits[1]}명`;
  }

  if (/\d/.test(value) && /명/.test(value)) return value;
  return null;
}

function pickFromPlainText(plain: string): string | null {
  const lines = plain.split(/\n+/);
  for (const line of lines) {
    const match = line.match(
      /(?:모집|채용)\s*인원|인원\s*(?:수|규모)?\s*[:：]?\s*([0-9][0-9\s~\-]*\s*명?|○+\s*명?)/,
    );
    if (match?.[1]) {
      const picked = normalizeHeadcountValue(match[1]);
      if (picked) return picked;
    }
  }

  const inline = plain.match(
    /(?:모집|채용)\s*인원\s*[:：]?\s*([0-9][0-9\s~\-]*\s*명?)/,
  );
  if (inline?.[1]) {
    const picked = normalizeHeadcountValue(inline[1]);
    if (picked) return picked;
  }

  return null;
}

/** 상세 HTML·요약 텍스트에서 모집 인원을 찾습니다. */
export function extractHeadcountFromJobContent(content: string): string | null {
  if (!content.trim()) return null;

  const ddMatch = content.match(
    /<dt[^>]*>[^<]*(?:모집|채용)\s*인원[^<]*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i,
  );
  if (ddMatch?.[1]) {
    const picked = normalizeHeadcountValue(htmlToPlainText(ddMatch[1]));
    if (picked) return picked;
  }

  const thMatch = content.match(
    /(?:모집|채용)\s*인원[\s\S]{0,80}?<t[dh][^>]*>([^<]+)/i,
  );
  if (thMatch?.[1]) {
    const picked = normalizeHeadcountValue(htmlToPlainText(thMatch[1]));
    if (picked) return picked;
  }

  return pickFromPlainText(htmlToPlainText(content));
}

import { htmlToPlainText, isInvalidJobDescription } from '@/lib/crawler/job-quality';
import { mergeCompanyAndTitle } from '@/lib/crawler/normalize-job-title';
import { textSection } from '@/lib/crawler/map-fields';
import { fetchText } from '@/lib/crawler/fetch-text';

import { BROWSER_HTML_HEADERS } from '@/lib/crawler/browser-headers';

const BROWSER_HEADERS = BROWSER_HTML_HEADERS;

export type JobDetailFetchResult = {
  title?: string;
  companyName?: string;
  deadline?: string | null;
  description: string;
};

function stripNoise(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');
}

function matchGroup(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function parseDeadlineFromPeriod(period: string | null): string | null {
  if (!period) return null;
  const end = period.match(/(\d{4})\.(\d{2})\.(\d{2})\s*$/);
  if (!end) return null;
  return `${end[1]}-${end[2]}-${end[3]}`;
}

function parseNongshimDetail(html: string): JobDetailFetchResult | null {
  const companyName = matchGroup(html, /<span class="company-name">([^<]+)<\/span>/i);
  const title = matchGroup(html, /<div class="tit">\s*([\s\S]*?)\s*<\/div>/i);
  const period = matchGroup(html, /서류접수기간<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i);
  const viewHtml = matchGroup(html, /<div class="view">([\s\S]*?)<\/div>/i);

  if (!title) return null;

  const sections = [
    period ? textSection('서류 접수 기간', period) : null,
    viewHtml ? `<section><h3>채용 안내</h3>${viewHtml}</section>` : null,
  ].filter(Boolean);

  const description = sections.join('');
  if (!description || isInvalidJobDescription(description)) return null;

  return {
    companyName: companyName ?? undefined,
    title: mergeCompanyAndTitle(companyName ?? undefined, title),
    deadline: parseDeadlineFromPeriod(period),
    description,
  };
}

function pickLargestHtmlBlock(html: string): string | null {
  const patterns = [
    /<div[^>]+class="[^"]*table-style-box-view[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<form/i,
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<div[^>]+class="[^"]*(?:job|recruit|detail|content|description|notice|posting)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  let best: string | null = null;
  let bestLen = 0;

  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
    for (const match of html.matchAll(flags)) {
      const block = match[1]?.trim();
      if (!block || isInvalidJobDescription(block)) continue;
      const len = htmlToPlainText(block).length;
      if (len > bestLen) {
        bestLen = len;
        best = block;
      }
    }
  }

  return bestLen >= 80 || (best && /<img\s/i.test(best)) ? best : null;
}

function parseGenericDetail(html: string): JobDetailFetchResult | null {
  const cleaned = stripNoise(html);
  const block = pickLargestHtmlBlock(cleaned);
  if (!block || isInvalidJobDescription(block)) return null;

  const description = `<section><h3>상세 내용</h3>${block}</section>`;
  if (isInvalidJobDescription(description)) return null;

  return { description };
}

export async function fetchJobDetail(applyUrl: string, referer: string): Promise<JobDetailFetchResult | null> {
  try {
    const html = await fetchText(applyUrl, {
      headers: {
        ...BROWSER_HEADERS,
        Referer: referer,
      },
    });

    if (/recruit\.nongshim\.com/i.test(applyUrl)) {
      return parseNongshimDetail(html);
    }

    return parseGenericDetail(html);
  } catch {
    return null;
  }
}

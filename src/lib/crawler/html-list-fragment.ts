import { isLikelyJobPosting, isLikelyJobTitle } from '@/lib/crawler/job-heuristics';
import { normalizeJobTitle } from '@/lib/crawler/normalize-job-title';

export type HtmlListCandidate = {
  title: string;
  applyUrl: string;
  companyName: string;
  dedupeKey: string;
  deadline?: string | null;
  locationHint?: string;
  roleHint?: string;
  periodHint?: string;
  detailApiUrl?: string;
};

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (!/^https?:$/i.test(resolved.protocol)) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseSeq(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/,/g, '').trim();
  return digits || null;
}

function parseDeadlineFromPeriod(period: string | null | undefined): string | null {
  if (!period) return null;
  const matches = [...period.matchAll(/(\d{4})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/g)];
  const last = matches.at(-1);
  if (!last) return null;
  return `${last[1]}-${last[2].padStart(2, '0')}-${last[3].padStart(2, '0')}`;
}

function parseMaxPage(html: string): number {
  const match = html.match(/class="divCnt"[^>]*data-max="(\d+)"/i);
  return match ? Number.parseInt(match[1], 10) : 1;
}

export function getHtmlListMaxPage(html: string): number {
  return parseMaxPage(html);
}

/** AJAX로 받은 HTML 조각에서 채용 공고 후보를 추출합니다. */
export function extractCandidatesFromHtmlFragment(
  html: string,
  baseUrl: string,
  defaultCompanyName: string,
  careersUrl?: string,
): HtmlListCandidate[] {
  const candidates: HtmlListCandidate[] = [];
  const seen = new Set<string>();
  const origin = new URL(baseUrl).origin;

  const blocks = html.includes('<li')
    ? html.split('<li>').slice(1)
    : [html];

  for (const block of blocks) {
    const title = cleanText(
      block.match(/<h3[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ??
        block.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ??
        '',
    );
    if (!title || !isLikelyJobTitle(title)) continue;

    const companyName =
      cleanText(block.match(/class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '') ||
      defaultCompanyName;
    const period = cleanText(block.match(/class="[^"]*period[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '');
    const roleLabels = [...block.matchAll(/class="[^"]*flag[^"]*"[^>]*>([^<]+)</gi)].map((m) => m[1].trim());
    const seq =
      parseSeq(block.match(/class="[^"]*btnShare[^"]*"[^>]*data-value="([^"]+)"/i)?.[1]) ??
      parseSeq(block.match(/<a[^>]+data-value="([^"]+)"/i)?.[1]);

    const rawHref = block.match(/href=["']([^"']+)["']/i)?.[1]?.trim() ?? '';
    const placeholderHref =
      !rawHref ||
      rawHref === '#none' ||
      rawHref === '/#none' ||
      rawHref.startsWith('#') ||
      /^javascript:/i.test(rawHref);

    let applyUrl = !placeholderHref ? resolveUrl(rawHref, baseUrl) : null;
    if (!applyUrl && seq) {
      applyUrl = `${origin}/hr/?no=${seq}`;
    }

    if (!applyUrl || seen.has(applyUrl)) continue;
    if (!isLikelyJobPosting(title, applyUrl, careersUrl) && !seq) continue;

    seen.add(applyUrl);
    candidates.push({
      title: normalizeJobTitle(title),
      applyUrl,
      companyName,
      dedupeKey: applyUrl,
      deadline: parseDeadlineFromPeriod(period),
      periodHint: period || undefined,
      roleHint: roleLabels.join(' ') || undefined,
      detailApiUrl: seq ? `${origin}/recruit/detail.data?seqno=${seq}&strCode=` : undefined,
    });
  }

  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1]?.trim();
    const title = cleanText(match[2] ?? '');
    if (!href || !title || !isLikelyJobPosting(title, href, careersUrl)) continue;
    const applyUrl = resolveUrl(href, baseUrl);
    if (!applyUrl || seen.has(applyUrl)) continue;
    seen.add(applyUrl);
    candidates.push({
      title: normalizeJobTitle(title),
      applyUrl,
      companyName: defaultCompanyName,
      dedupeKey: applyUrl,
    });
  }

  return candidates;
}

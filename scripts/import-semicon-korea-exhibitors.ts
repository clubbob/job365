/**
 * SEMICON Korea 2026 공식 참가사 목록 → data/semicon-korea-2026-exhibitors.json
 * pnpm import:semicon-exhibitors
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringifyJsonSafe } from '@/lib/json-safe-stringify';
import {
  semiconExhibitorNormalizeKey,
  semiconExhibitorsDataPath,
  type SemiconExhibitorRecord,
} from '@/lib/semi-display-equipment/semicon-exhibitors';

const SOURCE_URL =
  'https://expo.semi.org/korea2026/Public/exhibitors.aspx?ID=31093&sortMenu=102001';

type ExhibitorRow = SemiconExhibitorRecord;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseExhibitorsFromHtml(html: string): ExhibitorRow[] {
  const rows: ExhibitorRow[] = [];
  const nameRe =
    /<td[^>]*class="[^"]*companyName[^"]*"[^>]*>\s*<a[^>]*class="[^"]*exhibitorName[^"]*"[^>]*href="[^"]*BoothID=(\d+)"[^>]*>([^<]+)<\/a>\s*<\/td>\s*<td[^>]*class="[^"]*boothLabel[^"]*"[^>]*>[\s\S]*?sortVal="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = nameRe.exec(html)) !== null) {
    const boothId = match[1].trim();
    const companyName = decodeHtmlEntities(match[2].replace(/\s+/g, ' ').trim());
    const booth = match[3].replace(/\s+/g, ' ').trim();
    if (!companyName || companyName.length < 2) continue;
    rows.push({ companyName, booth, boothId });
  }
  return rows;
}

function dedupeExhibitors(rows: ExhibitorRow[]): ExhibitorRow[] {
  const seen = new Set<string>();
  const out: ExhibitorRow[] = [];
  for (const row of rows) {
    const key = semiconExhibitorNormalizeKey(row.companyName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.sort((a, b) => a.companyName.localeCompare(b.companyName, 'en'));
}

function mergePriorEnrichment(fresh: ExhibitorRow[]): ExhibitorRow[] {
  try {
    const prior = JSON.parse(readFileSync(semiconExhibitorsDataPath, 'utf8')) as {
      exhibitors?: SemiconExhibitorRecord[];
    };
    const byKey = new Map<string, SemiconExhibitorRecord>();
    for (const row of prior.exhibitors ?? []) {
      const key = semiconExhibitorNormalizeKey(row.companyName);
      if (key) byKey.set(key, row);
    }
    return fresh.map((row) => {
      const key = semiconExhibitorNormalizeKey(row.companyName);
      const old = key ? byKey.get(key) : undefined;
      if (!old) return row;
      return {
        ...row,
        websiteUrl: old.websiteUrl ?? row.websiteUrl,
        websiteCheckedAt: old.websiteCheckedAt ?? row.websiteCheckedAt,
      };
    });
  } catch {
    return fresh;
  }
}

async function main(): Promise<void> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 JobLink365-Registry/1.0 (+https://joblink365.com)',
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`SEMICON 참가사 페이지 HTTP ${res.status}`);
  const html = await res.text();
  const exhibitors = mergePriorEnrichment(dedupeExhibitors(parseExhibitorsFromHtml(html)));
  if (exhibitors.length < 100) {
    throw new Error(`참가사 ${exhibitors.length}곳만 파싱됨 — HTML 구조가 바뀌었을 수 있습니다.`);
  }

  const payload = {
    version: 1 as const,
    updatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    event: 'SEMICON Korea 2026',
    sourceNote: 'SEMICON Korea 2026 공식 참가사 목록. 반도체·디스플레이 회사 수집 명단에 병합합니다.',
    exhibitorCount: exhibitors.length,
    exhibitors,
  };

  writeFileSync(semiconExhibitorsDataPath, stringifyJsonSafe(payload), 'utf8');
  console.log(`저장: data/semicon-korea-2026-exhibitors.json — 참가사 ${exhibitors.length.toLocaleString('ko-KR')}곳`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

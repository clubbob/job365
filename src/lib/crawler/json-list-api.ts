import { BROWSER_AJAX_HEADERS } from '@/lib/crawler/browser-headers';
import { isLikelyJobTitle } from '@/lib/crawler/job-heuristics';
import { normalizeJobTitle } from '@/lib/crawler/normalize-job-title';
import { fetchText } from '@/lib/crawler/fetch-text';

export type JsonRecruitListCandidate = {
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

type RecruitRecord = Record<string, unknown>;

function parseYmdDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length < 8) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function extractRecruitListItems(payload: unknown): { items: RecruitRecord[]; total: number } {
  if (!payload || typeof payload !== 'object') return { items: [], total: 0 };
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (!data || typeof data !== 'object') return { items: [], total: 0 };
  const record = data as Record<string, unknown>;

  if (Array.isArray(record.list)) {
    const total = Number(record.listCnt ?? record.totalCount ?? record.list.length);
    return { items: record.list as RecruitRecord[], total };
  }

  const merged = [
    ...(Array.isArray(record.themeApplyList) ? record.themeApplyList : []),
    ...(Array.isArray(record.appList) ? record.appList : []),
  ] as RecruitRecord[];

  return { items: merged, total: merged.length };
}

export function recruitRecordToCandidate(
  item: RecruitRecord,
  origin: string,
  defaultCompanyName: string,
): JsonRecruitListCandidate | null {
  const title = [item.recuNoticeNm, item.title, item.jobNoticeName, item.jobOfferTitle].find(
    (value) => typeof value === 'string' && value.trim().length >= 4,
  ) as string | undefined;
  if (!title || !isLikelyJobTitle(title.trim())) return null;

  const recuYy = typeof item.recuYy === 'string' ? item.recuYy : null;
  const recuType = typeof item.recuType === 'string' ? item.recuType : null;
  const recuCls = item.recuCls;

  const companyName =
    (typeof item.logoNm === 'string' && item.logoNm.trim()) ||
    (typeof item.cmpNameKr === 'string' && item.cmpNameKr.trim()) ||
    (typeof item.companyName === 'string' && item.companyName.trim()) ||
    defaultCompanyName;

  let applyUrl: string | null = null;
  let detailApiUrl: string | undefined;

  if (recuYy && recuType && recuCls != null) {
    const cls = String(recuCls);
    applyUrl = `${origin}/apply/applyView.hc?recuYy=${recuYy}&recuType=${recuType}&recuCls=${cls}`;
    detailApiUrl = `${origin}/api/rec/AP-HM-FO-02820?hgrCd=1&lang=ko&recuYy=${recuYy}&recuType=${recuType}&recuCls=${cls}`;
  }

  const rawUrl = [item.detailUrl, item.applyUrl, item.url, item.link].find(
    (value) => typeof value === 'string' && value.trim(),
  ) as string | undefined;
  if (rawUrl) {
    try {
      applyUrl = new URL(rawUrl, origin).toString();
    } catch {
      // ignore invalid url
    }
  }

  if (!applyUrl) return null;

  const applyEndDt = parseYmdDate(item.applyEndDt ?? item.appDispEdDt);
  const roleHint = [item.fldCodeNm, item.secCodeNm, item.channelCodeNm]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' · ');

  return {
    title: normalizeJobTitle(title.trim()),
    applyUrl,
    companyName,
    dedupeKey: applyUrl,
    deadline: applyEndDt,
    locationHint: typeof item.workPlaceCodeNm === 'string' ? item.workPlaceCodeNm : undefined,
    roleHint: roleHint || undefined,
    periodHint:
      applyEndDt && typeof item.applyStartDt === 'string'
        ? `${item.applyStartDt} ~ ${item.applyEndDt}`
        : undefined,
    detailApiUrl,
  };
}

async function fetchJson(url: string, referer: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { ...BROWSER_AJAX_HEADERS, Referer: referer },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function discoverScriptApiPaths(origin: string): Promise<string[]> {
  const paths = new Set<string>();
  const scriptPaths = ['/static/js/common.js', '/static/js/common.api.js'];

  for (const scriptPath of scriptPaths) {
    try {
      const text = await fetchText(`${origin}${scriptPath}`, { headers: BROWSER_AJAX_HEADERS });
      for (const match of text.matchAll(/["']([a-z]+\/AP-[A-Z]+-FO-\d+)["']/gi)) {
        paths.add(match[1]);
      }
    } catch {
      // ignore missing script
    }
  }

  return [...paths];
}

function buildListApiUrl(origin: string, apiPath: string, page: number, pageSize: number): string {
  const params = new URLSearchParams({
    hgrCd: '1',
    lang: 'ko',
    page: String(page),
    pageblock: String(pageSize),
    searchFieldList: '',
    searchOccupList: '',
    searchPlaceList: '',
    searchSectorList: '',
    searchText: '',
    jdSec: '',
    srcOrd: '',
  });
  return `${origin}/api/${apiPath}?${params}`;
}

export async function fetchRecruitListCandidates(
  careersUrl: string,
  defaultCompanyName: string,
): Promise<JsonRecruitListCandidate[]> {
  const origin = new URL(careersUrl).origin;
  const candidates: JsonRecruitListCandidate[] = [];
  const seen = new Set<string>();

  const apiPaths = await discoverScriptApiPaths(origin);
  const prioritized = [
    ...apiPaths.filter((path) => path.startsWith('rec/')),
    ...apiPaths.filter((path) => path.startsWith('main/')),
    'rec/AP-HM-FO-02700',
    'main/AP-HM-FO-00900',
  ].filter((path, index, list) => list.indexOf(path) === index);

  for (const apiPath of prioritized) {
    const firstPayload = await fetchJson(buildListApiUrl(origin, apiPath, 1, 100), careersUrl);
    if (!firstPayload) continue;

    const first = extractRecruitListItems(firstPayload);
    if (first.items.length === 0) continue;

    const allItems = [...first.items];
    const pageSize = 100;
    const totalPages = Math.min(10, Math.ceil(first.total / pageSize));

    for (let page = 2; page <= totalPages; page += 1) {
      const payload = await fetchJson(buildListApiUrl(origin, apiPath, page, pageSize), careersUrl);
      if (!payload) break;
      const next = extractRecruitListItems(payload);
      if (next.items.length === 0) break;
      allItems.push(...next.items);
    }

    for (const item of allItems) {
      const candidate = recruitRecordToCandidate(item, origin, defaultCompanyName);
      if (!candidate || seen.has(candidate.dedupeKey)) continue;
      seen.add(candidate.dedupeKey);
      candidates.push(candidate);
    }

    if (candidates.length > 0) return candidates;
  }

  return candidates;
}

import { getKoreaDateLocalToday } from '@/lib/datetime';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import {
  countJobBoardTrendSnapshot,
  emptyJobBoardTrendSnapshot,
  type JobBoardTrendSnapshot,
} from '@/lib/job-board/trend';
import type { CrawledJobListItem } from '@/types/crawled-job';

const ADMIN_META_COLLECTION = 'adminMeta';
const TREND_DOC_ID = 'jobBoardTrend';
const HISTORY_LIMIT = 14;
const SAME_DAY_REFRESH_MS = 6 * 60 * 60 * 1000;

export type JobBoardTrendStore = {
  current: JobBoardTrendSnapshot;
  previous: JobBoardTrendSnapshot | null;
  history: JobBoardTrendSnapshot[];
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseCountMap<K extends string>(
  raw: unknown,
  keys: readonly K[],
): Record<K, number> | null {
  if (!isRecord(raw)) return null;
  const out = {} as Record<K, number>;
  for (const key of keys) {
    const n = Number(raw[key]);
    out[key] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return out;
}

function parseSnapshot(raw: unknown): JobBoardTrendSnapshot | null {
  if (!isRecord(raw)) return null;
  const empty = emptyJobBoardTrendSnapshot();
  const total = Number(raw.total);
  if (!Number.isFinite(total) || total < 0) return null;
  const at = typeof raw.at === 'string' ? raw.at : new Date().toISOString();
  const day =
    typeof raw.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.day)
      ? raw.day
      : getKoreaDateLocalToday(new Date(at));
  return {
    at,
    day,
    total,
    regions: parseCountMap(raw.regions, Object.keys(empty.regions) as (keyof typeof empty.regions)[]) ?? empty.regions,
    roles: parseCountMap(raw.roles, Object.keys(empty.roles) as (keyof typeof empty.roles)[]) ?? empty.roles,
    companySegments:
      parseCountMap(
        raw.companySegments,
        Object.keys(empty.companySegments) as (keyof typeof empty.companySegments)[],
      ) ?? empty.companySegments,
    employmentTypes:
      parseCountMap(
        raw.employmentTypes,
        Object.keys(empty.employmentTypes) as (keyof typeof empty.employmentTypes)[],
      ) ?? empty.employmentTypes,
  };
}

export async function readJobBoardTrendStore(): Promise<JobBoardTrendStore | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const snap = await db.collection(ADMIN_META_COLLECTION).doc(TREND_DOC_ID).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    const current = parseSnapshot(data.current);
    if (!current) return null;
    const previous = parseSnapshot(data.previous);
    const historyRaw = Array.isArray(data.history) ? data.history : [];
    const history = historyRaw
      .map((item) => parseSnapshot(item))
      .filter((item): item is JobBoardTrendSnapshot => Boolean(item))
      .slice(-HISTORY_LIMIT);
    return {
      current,
      previous,
      history,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : current.at,
    };
  } catch (error) {
    console.warn('[job-board-trend] read failed', error);
    return null;
  }
}

export async function persistJobBoardTrendSnapshot(
  live: JobBoardTrendSnapshot,
  options?: { force?: boolean },
): Promise<JobBoardTrendStore> {
  const existing = await readJobBoardTrendStore();
  const now = Date.now();
  const sameDay = existing?.current.day === live.day;
  const ageMs = existing ? now - new Date(existing.updatedAt).getTime() : Number.POSITIVE_INFINITY;
  const skipWrite =
    !options?.force &&
    sameDay &&
    existing != null &&
    existing.current.total === live.total &&
    Number.isFinite(ageMs) &&
    ageMs < SAME_DAY_REFRESH_MS;

  if (skipWrite && existing) {
    return { ...existing, current: live };
  }

  let previous = existing?.previous ?? null;
  let history = existing?.history ? [...existing.history] : [];
  if (sameDay && existing) {
    previous = existing.previous;
    const last = history[history.length - 1];
    if (last?.day === live.day) history[history.length - 1] = live;
    else history.push(live);
  } else {
    previous = existing?.current ?? null;
    history.push(live);
  }
  history = history.slice(-HISTORY_LIMIT);

  const store: JobBoardTrendStore = {
    current: live,
    previous,
    history,
    updatedAt: new Date().toISOString(),
  };

  const db = getAdminFirestore();
  if (db) {
    await db
      .collection(ADMIN_META_COLLECTION)
      .doc(TREND_DOC_ID)
      .set(store, { merge: true })
      .catch((error) => {
        console.warn('[job-board-trend] write failed', error);
      });
  }
  return store;
}

export async function persistJobBoardTrendFromJobs(
  jobs: Array<
    Pick<
      CrawledJobListItem,
      'title' | 'companyName' | 'companySize' | 'employmentTypes' | 'regions' | 'sourceId'
    >
  >,
): Promise<JobBoardTrendStore> {
  return persistJobBoardTrendSnapshot(countJobBoardTrendSnapshot(jobs), { force: true });
}

import { getKoreaDateLocalToday } from '@/lib/datetime';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { getCrawlStatsSummary, type CrawlStatsSummary } from '@/lib/crawl-stats-summary';

const COLLECTION = 'crawlStatsDaily';
const LIST_LIMIT = 60;

export type CrawlStatsDailySource = 'crawl' | 'summary' | 'cron';

export type CrawlStatsDailySnapshot = {
  day: string;
  capturedAt: string;
  capturedBefore: CrawlStatsDailySource;
  summary: CrawlStatsSummary;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseSnapshot(id: string, data: Record<string, unknown>): CrawlStatsDailySnapshot | null {
  const summary = data.summary;
  if (!isRecord(summary) || typeof summary.activeJobs !== 'number') return null;
  const day = typeof data.day === 'string' ? data.day : id;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const source = data.capturedBefore;
  const capturedBefore: CrawlStatsDailySource =
    source === 'summary' || source === 'cron' || source === 'crawl' ? source : 'summary';
  return {
    day,
    capturedAt: typeof data.capturedAt === 'string' ? data.capturedAt : `${day}T00:00:00+09:00`,
    capturedBefore,
    summary: summary as unknown as CrawlStatsSummary,
  };
}

async function todayRef() {
  const db = getAdminFirestore();
  if (!db) return null;
  const day = getKoreaDateLocalToday();
  return { db, day, ref: db.collection(COLLECTION).doc(day) };
}

export async function getCrawlStatsDaily(
  day = getKoreaDateLocalToday(),
): Promise<CrawlStatsDailySnapshot | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const snap = await db.collection(COLLECTION).doc(day).get();
    if (!snap.exists) return null;
    return parseSnapshot(snap.id, snap.data() ?? {});
  } catch (error) {
    console.warn('[crawl-stats-daily] get failed', error);
    return null;
  }
}

/** 그날 통계 요약이 없으면 한 번만 저장합니다. 이미 있으면 덮어쓰지 않습니다. */
export async function saveCrawlStatsDailyIfNeeded(
  summary: CrawlStatsSummary,
  source: CrawlStatsDailySource = 'summary',
): Promise<'saved' | 'exists' | 'skipped'> {
  const today = await todayRef();
  if (!today) return 'skipped';
  try {
    const existing = await today.ref.get();
    if (existing.exists) return 'exists';
    const snapshot: CrawlStatsDailySnapshot = {
      day: today.day,
      capturedAt: new Date().toISOString(),
      capturedBefore: source,
      summary,
    };
    await today.ref.create(snapshot);
    return 'saved';
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === '6' || code.includes('ALREADY_EXISTS')) return 'exists';
    console.warn('[crawl-stats-daily] save failed', error);
    return 'skipped';
  }
}

/** 수집 시작 전·매일 크론·수동 실행용. 이미 있으면 통계를 다시 세지 않습니다. */
export async function captureCrawlStatsDailyIfNeeded(
  source: CrawlStatsDailySource = 'crawl',
): Promise<'saved' | 'exists' | 'skipped'> {
  const today = await todayRef();
  if (!today) return 'skipped';
  try {
    if ((await today.ref.get()).exists) return 'exists';
    const summary = await getCrawlStatsSummary();
    return saveCrawlStatsDailyIfNeeded(summary, source);
  } catch (error) {
    console.warn('[crawl-stats-daily] capture failed', error);
    return 'skipped';
  }
}

export async function captureCrawlStatsDailyBeforeCrawl(): Promise<'saved' | 'exists' | 'skipped'> {
  return captureCrawlStatsDailyIfNeeded('crawl');
}

export async function listCrawlStatsDaily(limit = LIST_LIMIT): Promise<CrawlStatsDailySnapshot[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    const snap = await db.collection(COLLECTION).orderBy('day', 'desc').limit(Math.max(2, limit)).get();
    const items = snap.docs
      .map((doc) => parseSnapshot(doc.id, doc.data() ?? {}))
      .filter((item): item is CrawlStatsDailySnapshot => Boolean(item));
    return items.reverse();
  } catch (error) {
    console.warn('[crawl-stats-daily] list failed', error);
    return [];
  }
}

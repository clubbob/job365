/**
 * 전문 구인·구직 포털 유래 active 공고 건수 vs 삭제 후 잔여 (Firestore).
 * pnpm exec node scripts/count-portal-crawled-jobs.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isPortalCareersUrl } from './lib/careers-url-policy.mjs';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function isPortalSourcedJob(data) {
  const applyUrl = String(data.applyUrl ?? '');
  const sourceId = String(data.sourceId ?? '');
  const id = String(data.id ?? '');
  if (id.startsWith('work24-')) return true;
  if (sourceId.includes('work24')) return true;
  if (applyUrl && isPortalCareersUrl(applyUrl)) return true;
  return false;
}

loadEnvLocal();
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('Firebase Admin .env.local 설정이 필요합니다.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const snap = await db.collection('crawledJobs').where('status', '==', 'active').get();

let totalActive = 0;
let portalActive = 0;
let boardVisible = 0;
let boardPortal = 0;
const portalHosts = new Map();

for (const doc of snap.docs) {
  totalActive += 1;
  const data = doc.data();
  const portal = isPortalSourcedJob(data);
  if (portal) portalActive += 1;
  if (data.showInJobBoard === true) {
    boardVisible += 1;
    if (portal) boardPortal += 1;
  }
  if (!portal) continue;
  try {
    const host = new URL(String(data.applyUrl ?? '')).hostname;
    portalHosts.set(host, (portalHosts.get(host) ?? 0) + 1);
  } catch {
    portalHosts.set('(applyUrl 없음·work24 id)', (portalHosts.get('(applyUrl 없음·work24 id)') ?? 0) + 1);
  }
}

const remain = totalActive - portalActive;
console.log(
  JSON.stringify(
    {
      totalActive,
      portalActive,
      remainAfterDelete: remain,
      boardVisibleStoredFlag: boardVisible,
      boardPortalStoredFlag: boardPortal,
      boardRemainStoredFlag: boardVisible - boardPortal,
    },
    null,
    2,
  ),
);
console.log('포털 applyUrl 호스트별(상위):');
console.log(
  [...portalHosts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([h, n]) => `  ${h}: ${n}`)
    .join('\n'),
);

/**
 * 전문 구인·구직 포털 유래 crawledJobs 문서 삭제 (Firestore).
 * pnpm exec node scripts/purge-portal-crawled-jobs.mjs
 * 이후: pnpm exec tsx scripts/refresh-firestore-stats-after-purge.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isPortalSourcedCrawledJob } from './lib/careers-url-policy.mjs';

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
const PAGE = 400;
let scanned = 0;
let deleted = 0;
let lastDoc = null;

while (true) {
  let q = db.collection('crawledJobs').orderBy('__name__').limit(PAGE);
  if (lastDoc) q = q.startAfter(lastDoc);
  const snap = await q.get();
  if (snap.empty) break;

  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    scanned += 1;
    const data = doc.data();
    if (
      !isPortalSourcedCrawledJob({
        id: doc.id,
        sourceId: data.sourceId,
        applyUrl: data.applyUrl,
      })
    ) {
      continue;
    }
    batch.delete(doc.ref);
    ops += 1;
    deleted += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  lastDoc = snap.docs[snap.docs.length - 1];
  process.stdout.write(`\r스캔 ${scanned.toLocaleString('ko-KR')} · 삭제 ${deleted.toLocaleString('ko-KR')}`);
}

console.log(`\n완료: 스캔 ${scanned.toLocaleString('ko-KR')}건, 포털 유래 삭제 ${deleted.toLocaleString('ko-KR')}건`);

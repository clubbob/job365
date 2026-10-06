/**
 * 전용 수집기가 아닌 공고를 마감 처리합니다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const TRUSTED = new Set([
  'kakao-careers',
  'naver-careers',
  'lg-careers',
  'samsung-careers',
  'hyundai-careers',
  'coupang-careers',
  'krafton-careers',
  'daangn-careers',
  'sendbird-careers',
]);

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const snap = await db.collection('crawledJobs').where('status', '==', 'active').get();
const closedAt = new Date().toISOString();
let closed = 0;

for (const doc of snap.docs) {
  const sourceId = String(doc.data().sourceId ?? '');
  if (TRUSTED.has(sourceId)) continue;
  await doc.ref.set({ status: 'closed', closedAt, updatedAt: closedAt }, { merge: true });
  closed += 1;
}

console.log(`마감 처리: ${closed}건 (전용 수집기 공고만 유지)`);

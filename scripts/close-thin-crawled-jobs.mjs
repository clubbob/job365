/**
 * 상세 내용이 없는 잘못 수집된 공고를 마감 처리합니다.
 * 사용: node scripts/close-thin-crawled-jobs.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

function htmlToPlainText(html) {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isBadDescription(description) {
  const text = htmlToPlainText(description);
  if (/<img\s/i.test(description) && /서류|모집|채용|접수|지원/.test(text)) return false;
  if (text.length < 80) return true;
  if (/^채용 공고\s/.test(text) && text.length < 160) return true;
  if (/이메일\s*주소\s*무단\s*수집/.test(text)) return true;
  if (/정보통신망법에\s*의해\s*형사처벌/.test(text)) return true;
  return false;
}

const DUPLICATE_TITLE = /^(\S{2,20})\s+\1\s+/;

const EMPLOYEE_TITLE = /팀\s+[가-힣]{2,5}\s+(대리|과장|차장|부장|사원|팀장|주임|선임|책임|이사|프로)$/;

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
  const data = doc.data();
  const sourceId = String(data.sourceId ?? '');
  const title = String(data.title ?? '');
  const description = String(data.description ?? '');
  const bad =
    !TRUSTED.has(sourceId) &&
    (isBadDescription(description) || EMPLOYEE_TITLE.test(title.trim()) || DUPLICATE_TITLE.test(title.trim()));
  if (!bad) continue;

  await doc.ref.set({ status: 'closed', closedAt, updatedAt: closedAt }, { merge: true });
  closed += 1;
  console.log('closed', doc.id, title);
}

console.log(`마감 처리: ${closed}건`);
